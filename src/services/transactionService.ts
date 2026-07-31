import { supabase } from '@/config/supabase'
import type { Transaction, TransactionItem, PaymentMethod } from '@/types'
import { generateCode } from '@/utils/format'
import { ensureStaffWriteAccess } from '@/services/accessGuardService'

export async function fetchTransactions(branchId: string): Promise<Transaction[]> {
  let query = supabase
    .from('transactions')
    .select('*, user:users(id,name), branch:branches(id,name), items:transaction_items(*, product:products(id,name,unit))')

  if (branchId) {
    query = query.eq('branch_id', branchId)
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data as Transaction[]
}

export async function fetchPendingTransactions(branchId: string): Promise<Transaction[]> {
  let query = supabase
    .from('transactions')
    .select('*, items:transaction_items(*, product:products(id,name,unit))')
    .eq('status', 'pending')

  if (branchId) {
    query = query.eq('branch_id', branchId)
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Transaction[]
}

export async function createTransaction(payload: {
  branchId: string
  userId: string
  items: Array<{ product_id: string; quantity: number; unit_price: number }>
  customerName?: string
  customerPhone?: string
  paymentMethod?: PaymentMethod
  paidAmount?: number
  status: 'pending' | 'paid' | 'debt'
  notes?: string
}): Promise<Transaction> {
  await ensureStaffWriteAccess()

  // Semua penulisan (transaksi + item + stock_logs) dilakukan dalam satu RPC
  // agar atomik. Pengurangan stok TIDAK dilakukan di sini: trigger
  // trg_stock_on_sale sudah mengurangi products.stock saat stock_logs
  // bertipe 'sale' disisipkan. Update manual di client dulu menyebabkan
  // stok berkurang dua kali lipat.
  const { data, error } = await supabase.rpc('create_transaction', {
    p_branch_id: payload.branchId,
    p_user_id: payload.userId,
    p_items: payload.items.map((i) => ({
      product_id: i.product_id,
      quantity: i.quantity,
      unit_price: i.unit_price,
    })),
    p_status: payload.status,
    p_code: generateCode('TRX'),
    p_customer_name: payload.customerName ?? null,
    p_customer_phone: payload.customerPhone ?? null,
    p_payment_method: payload.paymentMethod ?? null,
    p_paid_amount: payload.paidAmount ?? 0,
    p_notes: payload.notes ?? null,
  })

  if (error) throw error
  return data as Transaction
}

export async function payTransactionItems(
  transactionId: string,
  itemIds: string[],
  paymentMethod: PaymentMethod,
  paidAmount: number,
  userId: string, // Staff who receives the payment
): Promise<void> {
  await ensureStaffWriteAccess()

  // Mark items as paid
  const { error } = await supabase
    .from('transaction_items')
    .update({ status: 'paid' })
    .in('id', itemIds)
  if (error) throw error

  // Check if all items paid → update transaction status
  const { data: items } = await supabase
    .from('transaction_items')
    .select('status')
    .eq('transaction_id', transactionId)

  const allPaid = (items ?? []).every((i: { status: string }) => i.status === 'paid')

  // Update transaction status and assign to the staff who processed the payment
  // This ensures the turnover goes to the staff who closed the transaction
  await supabase
    .from('transactions')
    .update({
      status: allPaid ? 'paid' : 'pending',
      payment_method: paymentMethod,
      paid_amount: paidAmount,
      user_id: userId, // Change ownership to the staff who received the payment
    })
    .eq('id', transactionId)
}

export async function markTransactionAsDebt(
  transactionId: string,
  customerName: string,
  customerPhone: string,
  customerAddress?: string,
): Promise<void> {
  await ensureStaffWriteAccess()

  const { error } = await supabase
    .from('transactions')
    .update({ 
      status: 'debt', 
      customer_name: customerName, 
      customer_phone: customerPhone 
    })
    .eq('id', transactionId)
  if (error) throw error

  await supabase
    .from('transaction_items')
    .update({ status: 'debt' })
    .eq('transaction_id', transactionId)
    .neq('status', 'paid')
}

export async function cancelTransactionItems(
  transactionId: string,
  itemIds: string[],
  branchId: string,
  userId: string,
): Promise<void> {
  await ensureStaffWriteAccess()

  // Mark items as cancelled
  const { error } = await supabase
    .from('transaction_items')
    .update({ status: 'cancelled' })
    .in('id', itemIds)
  if (error) throw error

  // KEMBALIKAN STOK
  for (const itemId of itemIds) {
    const { data: item } = await supabase
      .from('transaction_items')
      .select('product_id, quantity')
      .eq('id', itemId)
      .single()

    if (item) {
      const { data: product } = await supabase
        .from('products')
        .select('stock')
        .eq('id', item.product_id)
        .single()

      if (product) {
        const newStock = product.stock + item.quantity
        await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', item.product_id)

        await supabase.from('stock_logs').insert({
          product_id: item.product_id,
          branch_id: branchId,
          type: 'adjustment',
          quantity: item.quantity,
          notes: `Pengembalian stok - item dibatalkan`,
          user_id: userId
        })
      }
    }
  }

  // Check if all items cancelled → update transaction status
  const { data: items } = await supabase
    .from('transaction_items')
    .select('status')
    .eq('transaction_id', transactionId)

  const allCancelled = (items ?? []).every((i: { status: string }) => i.status === 'cancelled')
  const hasActive = (items ?? []).some((i: { status: string }) => i.status !== 'cancelled' && i.status !== 'paid')

  if (allCancelled) {
    await supabase.from('transactions').update({ status: 'cancelled' }).eq('id', transactionId)
  } else if (!hasActive) {
    await supabase.from('transactions').update({ status: 'paid' }).eq('id', transactionId)
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  await ensureStaffWriteAccess('delete_transaction')

  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw error
}

export async function fetchTransactionItems(transactionId: string): Promise<TransactionItem[]> {
  const { data, error } = await supabase
    .from('transaction_items')
    .select('*, product:products(id,name,unit)')
    .eq('transaction_id', transactionId)
  if (error) throw error
  return data as TransactionItem[]
}

import { supabase } from '@/config/supabase'
import type { Transaction, TransactionItem, PaymentMethod } from '@/types'
import { generateCode } from '@/utils/format'

export async function fetchTransactions(branchId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, user:users(id,name), branch:branches(id,name), items:transaction_items(*, product:products(id,name,unit))')
    .eq('branch_id', branchId)
    .order('created_at', { ascending: false })
    .limit(100)
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
  const totalAmount = payload.items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)
  const paidAmount = payload.paidAmount ?? 0

  const { data: trx, error: trxError } = await supabase
    .from('transactions')
    .insert({
      code: generateCode('TRX'),
      branch_id: payload.branchId,
      user_id: payload.userId,
      customer_name: payload.customerName ?? null,
      customer_phone: payload.customerPhone ?? null,
      status: payload.status,
      payment_method: payload.paymentMethod ?? null,
      total_amount: totalAmount,
      paid_amount: paidAmount,
      change_amount: Math.max(0, paidAmount - totalAmount),
      notes: payload.notes ?? null,
    })
    .select()
    .single()

  if (trxError) throw trxError

  const transactionId = (trx as Transaction).id

  const itemRows = payload.items.map((i) => ({
    transaction_id: transactionId,
    product_id: i.product_id,
    quantity: i.quantity,
    unit_price: i.unit_price,
    subtotal: i.quantity * i.unit_price,
    status: payload.status,
  }))

  const { error: itemsError } = await supabase.from('transaction_items').insert(itemRows)
  if (itemsError) throw itemsError

  return trx as Transaction
}

export async function payTransactionItems(
  transactionId: string,
  itemIds: string[],
  paymentMethod: PaymentMethod,
  paidAmount: number,
): Promise<void> {
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

  await supabase
    .from('transactions')
    .update({
      status: allPaid ? 'paid' : 'pending',
      payment_method: paymentMethod,
      paid_amount: paidAmount,
    })
    .eq('id', transactionId)
}

export async function markTransactionAsDebt(
  transactionId: string,
  customerName: string,
  customerPhone: string,
): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .update({ status: 'debt', customer_name: customerName, customer_phone: customerPhone })
    .eq('id', transactionId)
  if (error) throw error

  await supabase
    .from('transaction_items')
    .update({ status: 'debt' })
    .eq('transaction_id', transactionId)
    .neq('status', 'paid')
}

export async function deleteTransaction(id: string): Promise<void> {
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

import { supabase } from '@/config/supabase'
import type { Debt, DebtPayment } from '@/types'
import { generateCode } from '@/utils/format'

export async function fetchDebts(): Promise<Debt[]> {
  const { data, error } = await supabase
    .from('debts')
    .select('*, branch:branches(id,name), transaction:transactions(id,code,user:users(id,name))')
    .neq('status', 'paid')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Debt[]
}

export async function fetchDebtsAll(): Promise<Debt[]> {
  const { data, error } = await supabase
    .from('debts')
    .select('*, branch:branches(id,name), transaction:transactions(id,code,user:users(id,name))')
    .neq('status', 'paid')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Debt[]
}

export async function fetchPaidDebts(): Promise<Debt[]> {
  const { data, error } = await supabase
    .from('debts')
    .select('*, branch:branches(id,name), transaction:transactions(id,code,user:users(id,name))')
    .eq('status', 'paid')
    .order('updated_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return (data ?? []) as Debt[]
}

export async function createDebt(payload: {
  transaction_id: string
  branch_id: string
  customer_name: string
  customer_address?: string
  customer_phone?: string
  total_amount: number
}): Promise<Debt> {
  const { data, error } = await supabase
    .from('debts')
    .insert({
      ...payload,
      paid_amount: 0,
      remaining_amount: payload.total_amount,
      status: 'unpaid',
    })
    .select()
    .single()
  if (error) throw error
  return data as Debt
}

export async function payDebt(
  debtId: string,
  amount: number,
  userId: string,
  branchId: string,
  notes?: string,
): Promise<void> {
  const { data: debt } = await supabase
    .from('debts')
    .select('paid_amount, total_amount, remaining_amount')
    .eq('id', debtId)
    .single()

  if (!debt) throw new Error('Hutang tidak ditemukan')

  const d = debt as { paid_amount: number; total_amount: number; remaining_amount: number }
  const newPaid = d.paid_amount + amount
  const newRemaining = d.total_amount - newPaid
  const newStatus = newRemaining <= 0 ? 'paid' : 'partial'

  const { error: updateError } = await supabase
    .from('debts')
    .update({ paid_amount: newPaid, remaining_amount: Math.max(0, newRemaining), status: newStatus })
    .eq('id', debtId)
  if (updateError) throw updateError

  // Record payment
  const { error: payError } = await supabase.from('debt_payments').insert({
    debt_id: debtId,
    amount,
    user_id: userId,
    branch_id: branchId,
    notes: notes ?? null,
    code: generateCode('PAY'),
  })
  if (payError) throw payError
}

export async function fetchDebtPayments(debtId: string): Promise<DebtPayment[]> {
  const { data, error } = await supabase
    .from('debt_payments')
    .select('*, user:users(id,name)')
    .eq('debt_id', debtId)
    .order('created_at')
  if (error) throw error
  return data as DebtPayment[]
}

// Fetch unique customer names from debts (members)
export async function fetchDebtMembers(): Promise<string[]> {
  const { data, error } = await supabase
    .from('debts')
    .select('customer_name')
    .order('customer_name')
  if (error) throw error
  
  // Get unique names (all names who ever had debt)
  const uniqueNames = Array.from(new Set((data as { customer_name: string }[]).map(d => d.customer_name)))
  return uniqueNames
}

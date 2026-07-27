import { supabase } from '@/config/supabase'
import type { DailySales, TopProduct, StaffSales } from '@/types'

export async function getDailySales(branchId: string, days = 30): Promise<DailySales[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('transactions')
    .select('created_at, total_amount')
    .eq('branch_id', branchId)
    .eq('status', 'paid')
    .gte('created_at', since.toISOString())
    .order('created_at')

  if (error) throw error

  const grouped = new Map<string, { total: number; count: number }>()

  ;(data ?? []).forEach((row: { created_at: string; total_amount: number }) => {
    const date = row.created_at.slice(0, 10)
    const existing = grouped.get(date) ?? { total: 0, count: 0 }
    grouped.set(date, { total: existing.total + row.total_amount, count: existing.count + 1 })
  })

  return Array.from(grouped.entries()).map(([date, v]) => ({
    date,
    total: v.total,
    transaction_count: v.count,
  }))
}

export async function getTodayStats(branchId: string) {
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('transactions')
    .select('total_amount, status')
    .eq('branch_id', branchId)
    .gte('created_at', `${today}T00:00:00`)

  if (error) throw error

  const rows = data ?? []
  const revenue = rows
    .filter((r: { status: string; total_amount: number }) => r.status === 'paid')
    .reduce((sum: number, r: { total_amount: number }) => sum + r.total_amount, 0)

  return {
    revenue,
    transactionCount: rows.length,
  }
}

export async function getMonthlyRevenue(branchId: string): Promise<number> {
  const start = new Date()
  start.setDate(1)
  start.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('transactions')
    .select('total_amount')
    .eq('branch_id', branchId)
    .eq('status', 'paid')
    .gte('created_at', start.toISOString())

  if (error) throw error
  return (data ?? []).reduce((sum: number, r: { total_amount: number }) => sum + r.total_amount, 0)
}

export async function getTopProducts(branchId: string, limit = 10): Promise<TopProduct[]> {
  const { data, error } = await supabase
    .from('transaction_items')
    .select('product_id, quantity, subtotal, product:products(name), transaction:transactions!inner(branch_id, status)')
    .eq('transaction.branch_id', branchId)
    .eq('transaction.status', 'paid')
    .limit(500)

  if (error) throw error

  const grouped = new Map<string, TopProduct>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(data ?? []).forEach((row: any) => {
    const productName = Array.isArray(row.product) ? row.product[0]?.name : row.product?.name
    const existing = grouped.get(row.product_id) ?? {
      product_id: row.product_id,
      product_name: productName ?? row.product_id,
      quantity: 0,
      revenue: 0,
    }
    grouped.set(row.product_id, {
      ...existing,
      quantity: existing.quantity + row.quantity,
      revenue: existing.revenue + row.subtotal,
    })
  })

  return Array.from(grouped.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit)
}

export async function getStaffSales(branchId: string): Promise<StaffSales[]> {
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('transactions')
    .select('user_id, total_amount, user:users(name)')
    .eq('branch_id', branchId)
    .eq('status', 'paid')
    .gte('created_at', `${today}T00:00:00`)

  if (error) throw error

  const grouped = new Map<string, StaffSales>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(data ?? []).forEach((row: any) => {
    const userName = Array.isArray(row.user) ? row.user[0]?.name : row.user?.name
    const existing = grouped.get(row.user_id) ?? {
      user_id: row.user_id,
      user_name: userName ?? row.user_id,
      total: 0,
      transaction_count: 0,
    }
    grouped.set(row.user_id, {
      ...existing,
      total: existing.total + row.total_amount,
      transaction_count: existing.transaction_count + 1,
    })
  })

  return Array.from(grouped.values()).sort((a, b) => b.total - a.total)
}

export async function getLowStockProducts(branchId: string) {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, stock, min_stock, unit')
    .lte('stock', supabase.rpc('get_min_stock', { p_id: 'dummy' }) as unknown as number)
    .order('stock')
    .limit(20)

  if (error) {
    // fallback raw query
    const { data: fallback } = await supabase
      .from('products')
      .select('id, name, stock, min_stock, unit')
      .order('stock')
      .limit(20)

    return (fallback ?? []).filter(
      (p: { stock: number; min_stock: number }) => p.stock <= p.min_stock,
    )
  }

  return data ?? []
}

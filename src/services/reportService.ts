import { supabase } from '@/config/supabase'
import type { DailySales, TopProduct, StaffSales } from '@/types'

export async function getDailySales(branchId: string, days = 30): Promise<DailySales[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  // 1. Get sales
  let trxQuery = supabase
    .from('transactions')
    .select('created_at, total_amount')
    .eq('status', 'paid')
    .gte('created_at', since.toISOString())
  
  if (branchId) {
    trxQuery = trxQuery.eq('branch_id', branchId)
  }

  const { data: trxData, error: trxError } = await trxQuery.order('created_at')
  if (trxError) throw trxError

  // 2. Get debt payments
  let payQuery = supabase
    .from('debt_payments')
    .select('created_at, amount')
    .gte('created_at', since.toISOString())

  if (branchId) {
    payQuery = payQuery.eq('branch_id', branchId)
  }

  const { data: payData, error: payError } = await payQuery.order('created_at')
  if (payError) throw payError

  const grouped = new Map<string, { total: number; count: number }>()

  // Process sales
  ;(trxData ?? []).forEach((row: any) => {
    const date = row.created_at.slice(0, 10)
    const existing = grouped.get(date) ?? { total: 0, count: 0 }
    grouped.set(date, { total: existing.total + row.total_amount, count: existing.count + 1 })
  })

  // Process debt payments
  ;(payData ?? []).forEach((row: any) => {
    const date = row.created_at.slice(0, 10)
    const existing = grouped.get(date) ?? { total: 0, count: 0 }
    grouped.set(date, { total: existing.total + row.amount, count: existing.count + 1 })
  })

  return Array.from(grouped.entries()).map(([date, v]) => ({
    date,
    total: v.total,
    transaction_count: v.count,
  })).sort((a, b) => a.date.localeCompare(b.date))
}

export async function getTodayStats(branchId: string) {
  const today = new Date().toISOString().slice(0, 10)

  // Get paid transactions
  let trxQuery = supabase
    .from('transactions')
    .select('total_amount, status')
    .eq('status', 'paid')
    .gte('created_at', `${today}T00:00:00`)

  if (branchId) {
    trxQuery = trxQuery.eq('branch_id', branchId)
  }

  const { data: trxData, error: trxError } = await trxQuery
  if (trxError) throw trxError

  // Get debt payments
  let payQuery = supabase
    .from('debt_payments')
    .select('amount')
    .gte('created_at', `${today}T00:00:00`)

  if (branchId) {
    payQuery = payQuery.eq('branch_id', branchId)
  }

  const { data: payData, error: payError } = await payQuery
  if (payError) throw payError

  const salesRevenue = (trxData ?? []).reduce((sum: number, r: any) => sum + r.total_amount, 0)
  const debtRevenue = (payData ?? []).reduce((sum: number, r: any) => sum + r.amount, 0)

  return {
    revenue: salesRevenue + debtRevenue,
    transactionCount: (trxData ?? []).length + (payData ?? []).length,
  }
}

export async function getMonthlyRevenue(branchId: string): Promise<number> {
  const start = new Date()
  start.setDate(1)
  start.setHours(0, 0, 0, 0)

  let trxQuery = supabase
    .from('transactions')
    .select('total_amount')
    .eq('status', 'paid')
    .gte('created_at', start.toISOString())

  if (branchId) {
    trxQuery = trxQuery.eq('branch_id', branchId)
  }

  const { data: trxData, error: trxError } = await trxQuery
  if (trxError) throw trxError

  let payQuery = supabase
    .from('debt_payments')
    .select('amount')
    .gte('created_at', start.toISOString())

  if (branchId) {
    payQuery = payQuery.eq('branch_id', branchId)
  }

  const { data: payData, error: payError } = await payQuery
  if (payError) throw payError

  const salesRevenue = (trxData ?? []).reduce((sum: number, r: any) => sum + r.total_amount, 0)
  const debtRevenue = (payData ?? []).reduce((sum: number, r: any) => sum + r.amount, 0)

  return salesRevenue + debtRevenue
}

export async function getTopProducts(branchId: string, limit = 10): Promise<TopProduct[]> {
  let query = supabase
    .from('transaction_items')
    .select('product_id, quantity, subtotal, product:products(name), transaction:transactions!inner(branch_id, status)')
    .eq('transaction.status', 'paid')

  if (branchId) {
    query = query.eq('transaction.branch_id', branchId)
  }

  const { data, error } = await query.limit(500)

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

  // 1. Get direct sales
  const { data: sales, error: salesError } = await supabase
    .from('transactions')
    .select('user_id, total_amount, user:users(name)')
    .eq('branch_id', branchId)
    .eq('status', 'paid')
    .gte('created_at', `${today}T00:00:00`)

  if (salesError) throw salesError

  // 2. Get debt payments (omset for staff who received the payment)
  const { data: debtPayments, error: debtError } = await supabase
    .from('debt_payments')
    .select('user_id, amount, user:users(name)')
    .eq('branch_id', branchId)
    .gte('created_at', `${today}T00:00:00`)

  if (debtError) throw debtError

  const grouped = new Map<string, StaffSales>()

  // Process direct sales
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(sales ?? []).forEach((row: any) => {
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

  // Process debt payments
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(debtPayments ?? []).forEach((row: any) => {
    const userName = Array.isArray(row.user) ? row.user[0]?.name : row.user?.name
    const prev = grouped.get(row.user_id)
    const existing = prev ?? {
      user_id: row.user_id,
      user_name: userName ?? row.user_id,
      total: 0,
      transaction_count: 0,
    }
    grouped.set(row.user_id, {
      ...existing,
      total: existing.total + row.amount,
      // Note: We don't increment transaction_count for debt payments to avoid double counting 
      // or we can count it as a "payment activity"
    })
  })

  return Array.from(grouped.values()).sort((a, b) => b.total - a.total)
}

// branchId parameter reserved for future branch-level stock filtering
export async function getLowStockProducts(_branchId: string) {
  const { data } = await supabase
    .from('products')
    .select('id, name, stock, min_stock, unit')
    .order('stock')
    .limit(50)

  return (data ?? []).filter(
    (p: { stock: number; min_stock: number }) => p.stock <= p.min_stock,
  )
}

// Ambil stok menipis per cabang (untuk manager)
export async function getLowStockAllBranches(): Promise<{
  branch_id: string
  branch_name: string
  products: { id: string; name: string; stock: number; min_stock: number; unit: string }[]
}[]> {
  const { data: branches } = await supabase.from('branches').select('id, name').eq('is_active', true).order('name')

  const { data: allProducts } = await supabase
    .from('products')
    .select('id, name, stock, min_stock, unit, branch_id, branch:branches(name)')
    .order('stock')
    .limit(200)

  const results: { branch_id: string; branch_name: string; products: { id: string; name: string; stock: number; min_stock: number; unit: string }[] }[] = []

  // Group by branch
  const branchMap = new Map<string, { branch_name: string; products: { id: string; name: string; stock: number; min_stock: number; unit: string }[] }>()

  ;(allProducts ?? []).forEach((p: any) => {
    const bid = p.branch_id
    const bname = Array.isArray(p.branch) ? p.branch[0]?.name : p.branch?.name ?? 'Unknown'
    if (p.stock <= p.min_stock) {
      const entry = branchMap.get(bid) ?? { branch_name: bname, products: [] as { id: string; name: string; stock: number; min_stock: number; unit: string }[] }
      entry.products.push({ id: p.id, name: p.name, stock: p.stock, min_stock: p.min_stock, unit: p.unit })
      branchMap.set(bid, entry)
    }
  })

  branchMap.forEach((val, key) => {
    results.push({ branch_id: key, branch_name: val.branch_name, products: val.products })
  })

  results.sort((a, b) => a.branch_name.localeCompare(b.branch_name))
  return results
}

// Ambil stok menipis untuk cabang tertentu
export async function getLowStockByBranch(branchId: string) {
  const { data } = await supabase
    .from('products')
    .select('id, name, stock, min_stock, unit')
    .order('stock')

  return (data ?? []).filter(
    (p: { stock: number; min_stock: number }) => p.stock <= p.min_stock,
  )
}

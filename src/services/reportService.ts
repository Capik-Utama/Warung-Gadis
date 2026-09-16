import { supabase } from '@/config/supabase'
import type { DailySales, TopProduct, StaffSales } from '@/types'
import {
  getBusinessDayBounds,
  getBusinessDayBoundsForDate,
  getBusinessDayLabels,
  getBusinessDayLabel,
} from './businessDayHelper'
import { getResetHour } from './systemSettingService'

// ─── Helpers internal ────────────────────────────────────────────────────────

/**
 * Mengambil jam reset dan bounds hari ini.
 * Digunakan sebagai satu-satunya sumber kebenaran untuk "hari ini" di seluruh laporan.
 */
async function getTodayBounds(): Promise<{ from: string; to: string }> {
  const resetHour = await getResetHour()
  return getBusinessDayBounds(resetHour)
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getDailySales(branchId: string, days = 30): Promise<DailySales[]> {
  const resetHour = await getResetHour()
  const labels = getBusinessDayLabels(days, resetHour)
  if (labels.length === 0) return []

  const oldestLabel = labels[0]
  const latestLabel = labels[labels.length - 1]
  const since = getBusinessDayBoundsForDate(oldestLabel, resetHour)
  const until = getBusinessDayBoundsForDate(latestLabel, resetHour)

  // 1. Get sales
  let trxQuery = supabase
    .from('transactions')
    .select('created_at, total_amount')
    .eq('status', 'paid')
    .gte('created_at', since.from)
    .lt('created_at', until.to)

  if (branchId) {
    trxQuery = trxQuery.eq('branch_id', branchId)
  }

  const { data: trxData, error: trxError } = await trxQuery.order('created_at')
  if (trxError) throw trxError

  // 2. Get debt payments
  let payQuery = supabase
    .from('debt_payments')
    .select('created_at, amount')
    .gte('created_at', since.from)
    .lt('created_at', until.to)

  if (branchId) {
    payQuery = payQuery.eq('branch_id', branchId)
  }

  const { data: payData, error: payError } = await payQuery.order('created_at')
  if (payError) throw payError

  const grouped = new Map<string, { total: number; count: number }>()

  // Initialize semua label agar grafik konsisten
  labels.forEach((label) => grouped.set(label, { total: 0, count: 0 }))

  // Process sales - grup berdasarkan business day
  ;(trxData ?? []).forEach((row: any) => {
    const businessDay = getBusinessDayLabel(row.created_at, resetHour)
    const existing = grouped.get(businessDay) ?? { total: 0, count: 0 }
    grouped.set(businessDay, { total: existing.total + row.total_amount, count: existing.count + 1 })
  })

  // Process debt payments - grup berdasarkan business day
  ;(payData ?? []).forEach((row: any) => {
    const businessDay = getBusinessDayLabel(row.created_at, resetHour)
    const existing = grouped.get(businessDay) ?? { total: 0, count: 0 }
    grouped.set(businessDay, { total: existing.total + row.amount, count: existing.count + 1 })
  })

  return Array.from(grouped.entries()).map(([date, v]) => ({
    date,
    total: v.total,
    transaction_count: v.count,
  })).sort((a, b) => a.date.localeCompare(b.date))
}

export async function getTodayStats(branchId: string) {
  const bounds = await getTodayBounds()

  // Get paid transactions
  let trxQuery = supabase
    .from('transactions')
    .select('total_amount, status')
    .eq('status', 'paid')
    .gte('created_at', bounds.from)
    .lt('created_at', bounds.to)

  if (branchId) {
    trxQuery = trxQuery.eq('branch_id', branchId)
  }

  const { data: trxData, error: trxError } = await trxQuery
  if (trxError) throw trxError

  // Get debt payments
  let payQuery = supabase
    .from('debt_payments')
    .select('amount')
    .gte('created_at', bounds.from)
    .lt('created_at', bounds.to)

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
  // Monthly revenue tetap menggunakan tanggal kalender (1st of month)
  // karena bulanan tidak terpengaruh jam reset
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
  // Top products: ambil dari business day hari ini
  const bounds = await getTodayBounds()

  let query = supabase
    .from('transaction_items')
    .select('product_id, quantity, subtotal, product:products(name), transaction:transactions!inner(branch_id, status, created_at)')
    .eq('transaction.status', 'paid')
    .gte('transaction.created_at', bounds.from)
    .lt('transaction.created_at', bounds.to)

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
  const bounds = await getTodayBounds()

  // 1. Get direct sales
  const { data: sales, error: salesError } = await supabase
    .from('transactions')
    .select('user_id, total_amount, user:users(name)')
    .eq('branch_id', branchId)
    .eq('status', 'paid')
    .gte('created_at', bounds.from)
    .lt('created_at', bounds.to)

  if (salesError) throw salesError

  // 2. Get debt payments (omset for staff who received the payment)
  const { data: debtPayments, error: debtError } = await supabase
    .from('debt_payments')
    .select('user_id, amount, user:users(name)')
    .eq('branch_id', branchId)
    .gte('created_at', bounds.from)
    .lt('created_at', bounds.to)

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
    })
  })

  return Array.from(grouped.values()).sort((a, b) => b.total - a.total)
}

type LowStockRow = { id: string; name: string; stock: number; min_stock: number; unit: string }

async function lowStockForBranch(branchId: string): Promise<LowStockRow[]> {
  if (!branchId) return []

  const { data: stocks } = await supabase
    .from('product_stocks')
    .select('product_id, stock, min_stock, product:products(id, name, unit, is_active)')
    .eq('branch_id', branchId)
    .order('stock')
    .limit(200)

  return ((stocks ?? []) as any[])
    .map((s) => {
      const prod = Array.isArray(s.product) ? s.product[0] : s.product
      return {
        id: s.product_id,
        name: prod?.name ?? '-',
        unit: prod?.unit ?? 'pcs',
        stock: s.stock as number,
        min_stock: s.min_stock as number,
        is_active: prod?.is_active ?? true,
      }
    })
    .filter((p) => p.is_active && p.stock <= p.min_stock)
    .map(({ is_active: _ia, ...rest }) => rest)
}

export async function getLowStockProducts(branchId: string) {
  return lowStockForBranch(branchId)
}

// Ambil stok menipis per cabang (untuk manager)
export async function getLowStockAllBranches(): Promise<{
  branch_id: string
  branch_name: string
  products: LowStockRow[]
}[]> {
  const { data: branches } = await supabase
    .from('branches')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  const results: { branch_id: string; branch_name: string; products: LowStockRow[] }[] = []

  for (const b of (branches ?? []) as { id: string; name: string }[]) {
    const products = await lowStockForBranch(b.id)
    if (products.length > 0) {
      results.push({ branch_id: b.id, branch_name: b.name, products })
    }
  }

  return results
}

// Ambil stok menipis untuk cabang tertentu
export async function getLowStockByBranch(branchId: string) {
  return lowStockForBranch(branchId)
}

// Ambil statistik hari ini untuk staf tertentu di cabang tertentu
export async function getTodayStaffStats(branchId: string, userId: string) {
  const bounds = await getTodayBounds()

  // Get paid transactions by this staff
  let trxQuery = supabase
    .from('transactions')
    .select('total_amount')
    .eq('status', 'paid')
    .eq('user_id', userId)
    .gte('created_at', bounds.from)
    .lt('created_at', bounds.to)

  if (branchId) {
    trxQuery = trxQuery.eq('branch_id', branchId)
  }

  const { data: trxData, error: trxError } = await trxQuery
  if (trxError) throw trxError

  // Get debt payments received by this staff
  let payQuery = supabase
    .from('debt_payments')
    .select('amount')
    .eq('user_id', userId)
    .gte('created_at', bounds.from)
    .lt('created_at', bounds.to)

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


import type { DetailedReportResult, DetailedReportRow, ReportShiftOption } from '@/types/report'

export interface DetailedReportFilters {
  from: string
  to: string
  branchId?: string
  staffId?: string
  shiftId?: string
}

type ShiftLookup = {
  id: string
  user_id: string
  branch_id: string
  number?: number
  check_in: string
  check_out: string | null
  user?: { id: string; name: string } | { id: string; name: string }[]
  branch?: { id: string; name: string } | { id: string; name: string }[]
}

function relationOne<T>(relation: T | T[] | null | undefined): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation ?? null
}

function shiftForTimestamp(shifts: ShiftLookup[], userId: string, branchId: string, timestamp: string) {
  const time = new Date(timestamp).getTime()
  return shifts.find((shift) => {
    if (shift.user_id !== userId || shift.branch_id !== branchId) return false
    const start = new Date(shift.check_in).getTime()
    const end = shift.check_out ? new Date(shift.check_out).getTime() : Number.POSITIVE_INFINITY
    return time >= start && time <= end
  }) ?? null
}

export async function getReportShifts(filters: Pick<DetailedReportFilters, 'from' | 'to' | 'branchId' | 'staffId'>): Promise<ReportShiftOption[]> {
  let query = supabase
    .from('shifts')
    .select('id,user_id,branch_id,check_in,check_out,user:users(id,name),branch:branches(id,name)')
    .lte('check_in', filters.to)
    .or(`check_out.is.null,check_out.gte.${filters.from}`)
    .order('check_in', { ascending: true })
    .limit(500)

  if (filters.branchId) query = query.eq('branch_id', filters.branchId)
  if (filters.staffId) query = query.eq('user_id', filters.staffId)

  const { data, error } = await query
  if (error) throw error

  const counters = new Map<string, number>()
  return ((data ?? []) as ShiftLookup[]).map((shift) => {
    const user = relationOne(shift.user)
    const branch = relationOne(shift.branch)
    const key = `${shift.branch_id}:${shift.user_id}:${shift.check_in.slice(0, 10)}`
    const number = (counters.get(key) ?? 0) + 1
    counters.set(key, number)
    return {
      id: shift.id,
      number,
      staff_id: shift.user_id,
      staff_name: user?.name ?? shift.user_id,
      branch_id: shift.branch_id,
      branch_name: branch?.name ?? shift.branch_id,
      check_in: shift.check_in,
      check_out: shift.check_out,
    }
  })
}

export async function getDetailedReport(filters: DetailedReportFilters): Promise<DetailedReportResult> {
  let trxQuery = supabase
    .from('transactions')
    .select('id,code,user_id,branch_id,total_amount,payment_method,created_at,user:users(id,name),branch:branches(id,name)')
    .eq('status', 'paid')
    .gte('created_at', filters.from)
    .lt('created_at', filters.to)
    .order('created_at', { ascending: false })
    .limit(1000)
  if (filters.branchId) trxQuery = trxQuery.eq('branch_id', filters.branchId)
  if (filters.staffId) trxQuery = trxQuery.eq('user_id', filters.staffId)

  let payQuery = supabase
    .from('debt_payments')
    .select('id,code,user_id,branch_id,amount,created_at,user:users(id,name),branch:branches(id,name)')
    .gte('created_at', filters.from)
    .lt('created_at', filters.to)
    .order('created_at', { ascending: false })
    .limit(1000)
  if (filters.branchId) payQuery = payQuery.eq('branch_id', filters.branchId)
  if (filters.staffId) payQuery = payQuery.eq('user_id', filters.staffId)

  const [{ data: sales, error: salesError }, { data: payments, error: paymentsError }] = await Promise.all([trxQuery, payQuery])
  if (salesError) throw salesError
  if (paymentsError) throw paymentsError

  const shifts = await getReportShifts(filters)
  const shiftLookups: ShiftLookup[] = shifts.map((shift) => ({
    id: shift.id,
    user_id: shift.staff_id,
    branch_id: shift.branch_id,
    number: shift.number,
    check_in: shift.check_in,
    check_out: shift.check_out,
  }))
  const rows: DetailedReportRow[] = []

  for (const sale of (sales ?? []) as any[]) {
    const shift = filters.shiftId ? shiftLookups.find((item) => item.id === filters.shiftId && item.user_id === sale.user_id && item.branch_id === sale.branch_id) : shiftForTimestamp(shiftLookups, sale.user_id, sale.branch_id, sale.created_at)
    if (filters.shiftId && (!shift || !shiftForTimestamp([shift], sale.user_id, sale.branch_id, sale.created_at))) continue
    const user = relationOne(sale.user)
    const branch = relationOne(sale.branch)
    rows.push({
      id: sale.id,
      kind: 'Penjualan',
      date: sale.created_at,
      code: sale.code,
      amount: Number(sale.total_amount ?? 0),
      staff_id: sale.user_id,
      staff_name: user?.name ?? sale.user_id,
      branch_id: sale.branch_id,
      branch_name: branch?.name ?? sale.branch_id,
      shift_id: shift?.id ?? null,
      shift_number: shift?.number ?? null,
      payment_method: sale.payment_method ?? '-',
    })
  }

  for (const payment of (payments ?? []) as any[]) {
    const shift = filters.shiftId ? shiftLookups.find((item) => item.id === filters.shiftId && item.user_id === payment.user_id && item.branch_id === payment.branch_id) : shiftForTimestamp(shiftLookups, payment.user_id, payment.branch_id, payment.created_at)
    if (filters.shiftId && (!shift || !shiftForTimestamp([shift], payment.user_id, payment.branch_id, payment.created_at))) continue
    const user = relationOne(payment.user)
    const branch = relationOne(payment.branch)
    rows.push({
      id: payment.id,
      kind: 'Pembayaran Member',
      date: payment.created_at,
      code: payment.code ?? '-',
      amount: Number(payment.amount ?? 0),
      staff_id: payment.user_id,
      staff_name: user?.name ?? payment.user_id,
      branch_id: payment.branch_id,
      branch_name: branch?.name ?? payment.branch_id,
      shift_id: shift?.id ?? null,
      shift_number: shift?.number ?? null,
      payment_method: 'Pembayaran member',
    })
  }

  rows.sort((a, b) => b.date.localeCompare(a.date))
  return {
    rows,
    summary: {
      total: rows.reduce((sum, row) => sum + row.amount, 0),
      transaction_count: rows.length,
      staff_count: new Set(rows.map((row) => row.staff_id)).size,
      branch_count: new Set(rows.map((row) => row.branch_id)).size,
      shift_count: new Set(rows.map((row) => row.shift_id).filter(Boolean)).size,
    },
  }
}

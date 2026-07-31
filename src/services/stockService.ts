import { supabase } from '@/config/supabase'
import type { StockLog } from '@/types'
import { ensureStaffWriteAccess } from '@/services/accessGuardService'

export async function fetchStockLogs(branchId: string): Promise<StockLog[]> {
  const { data, error } = await supabase
    .from('stock_logs')
    .select('*, product:products(id,name,unit), user:users(id,name)')
    .eq('branch_id', branchId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return data as StockLog[]
}

export async function getBranchStock(productId: string, branchId: string): Promise<number> {
  const { data } = await supabase
    .from('product_stocks')
    .select('stock')
    .eq('product_id', productId)
    .eq('branch_id', branchId)
    .maybeSingle()
  return (data as { stock: number } | null)?.stock ?? 0
}

export async function addStock(payload: {
  product_id: string
  branch_id: string
  type: 'in' | 'out' | 'adjustment'
  quantity: number
  notes: string
  user_id: string
}): Promise<void> {
  await ensureStaffWriteAccess('add_stock')

  if (!payload.branch_id) throw new Error('Cabang wajib dipilih')

  const { error: logError } = await supabase.from('stock_logs').insert(payload)
  if (logError) throw logError

  const multiplier = payload.type === 'out' ? -1 : 1
  const { error: stockError } = await supabase.rpc('adjust_branch_stock', {
    p_product_id: payload.product_id,
    p_branch_id: payload.branch_id,
    p_delta: multiplier * payload.quantity,
  })
  if (stockError) throw stockError
}

/**
 * Set stok cabang ke nilai tertentu. Selisihnya dicatat sebagai
 * penyesuaian di stock_logs.
 */
export async function setBranchStock(payload: {
  product_id: string
  branch_id: string
  new_stock: number
  user_id: string
  notes?: string
}): Promise<void> {
  await ensureStaffWriteAccess('add_stock')

  if (!payload.branch_id) throw new Error('Cabang wajib dipilih')
  const target = Math.max(0, Math.floor(payload.new_stock))

  const current = await getBranchStock(payload.product_id, payload.branch_id)
  const delta = target - current

  const { error: rpcError } = await supabase.rpc('set_branch_stock', {
    p_product_id: payload.product_id,
    p_branch_id: payload.branch_id,
    p_stock: target,
  })
  if (rpcError) throw rpcError

  if (delta !== 0) {
    await supabase.from('stock_logs').insert({
      product_id: payload.product_id,
      branch_id: payload.branch_id,
      type: 'adjustment',
      quantity: Math.abs(delta),
      notes: payload.notes?.trim()
        ? payload.notes.trim()
        : `Set stok ${current} -> ${target}`,
      user_id: payload.user_id,
    })
  }
}

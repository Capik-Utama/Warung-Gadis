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

export async function addStock(payload: {
  product_id: string
  branch_id: string
  type: 'in' | 'out' | 'adjustment'
  quantity: number
  notes: string
  user_id: string
}): Promise<void> {
  await ensureStaffWriteAccess()

  // Insert log
  const { error: logError } = await supabase.from('stock_logs').insert(payload)
  if (logError) throw logError

  // Update product stock
  const multiplier = payload.type === 'out' ? -1 : 1
  const { error: stockError } = await supabase.rpc('adjust_stock', {
    p_product_id: payload.product_id,
    p_delta: multiplier * payload.quantity,
  })
  if (stockError) {
    // fallback: manual update
    const { data: product } = await supabase
      .from('products')
      .select('stock')
      .eq('id', payload.product_id)
      .single()
    if (product) {
      const newStock = Math.max(0, (product as { stock: number }).stock + multiplier * payload.quantity)
      await supabase.from('products').update({ stock: newStock }).eq('id', payload.product_id)
    }
  }
}

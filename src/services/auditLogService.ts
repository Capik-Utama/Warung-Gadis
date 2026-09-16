import { supabase } from '@/config/supabase'

export interface AuditLog {
  id: string
  category: string
  action: string
  entity_type: string
  entity_id: string | null
  actor_user_id: string | null
  actor_name: string | null
  branch_id: string | null
  branch?: { name: string }[] | null
  description: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface AuditLogFilters {
  from: string
  to: string
  category?: string
}

export async function fetchAuditLogs(filters: AuditLogFilters): Promise<AuditLog[]> {
  let query = supabase
    .from('audit_logs')
    .select('id,category,action,entity_type,entity_id,actor_user_id,actor_name,branch_id,branch:branches(name),description,metadata,created_at')
    .gte('created_at', filters.from)
    .lt('created_at', filters.to)
    .order('created_at', { ascending: false })
    .limit(2000)

  if (filters.category) query = query.eq('category', filters.category)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as AuditLog[]
}

export function auditCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    Penjualan: 'Penjualan',
    Stok: 'Stok',
    'Stok Produk': 'Stok',
    Staf: 'Staf',
    Shift: 'Shift',
    'Serah Terima Shift': 'Shift',
    Cabang: 'Cabang',
    Produk: 'Produk',
    Kategori: 'Kategori',
    'Member/Hutang': 'Member/Hutang',
    'Pembayaran Member': 'Pembayaran Member',
    Pengaturan: 'Pengaturan',
  }
  return labels[category] ?? category
}

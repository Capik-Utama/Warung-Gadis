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

export async function recordAuthEvent(
  event: 'login' | 'logout',
  user: { id: string; name: string },
  branchId?: string | null,
): Promise<void> {
  const description = event === 'login' ? `${user.name} masuk (login)` : `${user.name} pulang (logout)`
  const { error } = await supabase.from('audit_logs').insert({
    category: 'Staf',
    action: event,
    entity_type: 'auth',
    entity_id: user.id,
    actor_user_id: user.id,
    actor_name: user.name,
    branch_id: branchId ?? null,
    description,
    metadata: { event, source: 'application' },
  })
  if (error) console.warn('[Warung Gadis] Gagal menyimpan log autentikasi:', error.message)
}

export function auditCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    Penjualan: 'Penjualan', Stok: 'Stok', 'Stok Produk': 'Stok', Staf: 'Staf', Shift: 'Shift',
    'Serah Terima Shift': 'Shift', Cabang: 'Cabang', Produk: 'Produk', Kategori: 'Kategori',
    'Member/Hutang': 'Member/Hutang', 'Pembayaran Member': 'Pembayaran Member', Pengaturan: 'Pengaturan',
  }
  return labels[category] ?? category
}

export async function logOutUser(
  user: { id: string; name: string },
  branchId?: string | null,
): Promise<void> {
  await recordAuthEvent('logout', user, branchId)
}

import { supabase } from '@/config/supabase'
import type { UserRole } from '@/types'

export interface AuditLog {
  id: string
  category: string
  action: string
  entity_type: string
  entity_id: string | null
  actor_user_id: string | null
  actor_name: string | null
  actor_role: UserRole | null
  branch_id: string | null
  branch?: { name: string }[] | { name: string } | null
  description: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface AuditLogFilters {
  from: string
  to: string
  category?: string
  viewerRole?: UserRole
}

export async function fetchAuditLogs(filters: AuditLogFilters): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id,category,action,entity_type,entity_id,actor_user_id,actor_name,actor_role,branch_id,description,metadata,created_at')
    .gte('created_at', filters.from)
    .lt('created_at', filters.to)
    .order('created_at', { ascending: false })
    .limit(2000)
  if (error) throw error

  const logs = (data ?? []) as AuditLog[]
  const branchIds = Array.from(new Set(logs.map((log) => log.branch_id).filter(Boolean))) as string[]
  if (branchIds.length > 0) {
    const { data: branches } = await supabase.from('branches').select('id,name').in('id', branchIds)
    const branchNames = new Map((branches ?? []).map((branch) => [branch.id, branch.name]))
    logs.forEach((log) => {
      const name = log.branch_id ? branchNames.get(log.branch_id) : undefined
      log.branch = name ? [{ name }] : null
    })
  }
  if (filters.viewerRole !== 'manager') return logs

  const actorIds = Array.from(new Set(logs.map((log) => log.actor_user_id).filter(Boolean))) as string[]
  if (actorIds.length === 0) return logs.filter((log) => log.actor_role !== 'developer')
  const { data: actors } = await supabase.from('users').select('id,role').in('id', actorIds)
  const developerIds = new Set((actors ?? []).filter((actor) => actor.role === 'developer').map((actor) => actor.id))
  return logs.filter((log) => log.actor_role !== 'developer' && !developerIds.has(log.actor_user_id ?? ''))
}

export async function recordAuthEvent(
  event: 'login' | 'logout',
  user: { id: string; name: string; role: UserRole },
  branchId?: string | null,
): Promise<void> {
  const description = event === 'login' ? `${user.name} masuk (login)` : `${user.name} pulang (logout)`
  const { error } = await supabase.from('audit_logs').insert({
    category: 'Staf', action: event, entity_type: 'auth', entity_id: user.id,
    actor_user_id: user.id, actor_name: user.name, actor_role: user.role,
    branch_id: branchId ?? null, description,
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

export function auditEventCategory(log: Pick<AuditLog, 'category' | 'action' | 'entity_type'>) {
  const action = log.action.toLowerCase()
  if (action === 'login') return 'Login'
  if (action === 'logout') return 'Logout'
  if (action === 'check_in' || action.includes('masuk staf')) return 'Masuk'
  if (action === 'check_out' || action.includes('keluar staf')) return 'Pulang'
  if (action.startsWith('shift_handover_') || log.entity_type === 'shift_handovers') return 'Shift'
  if (log.entity_type === 'products' && log.action === 'insert') return 'Tambah Produk'
  if (log.entity_type === 'products' && log.action === 'update') return 'Edit Produk'
  if (log.entity_type === 'products' && log.action === 'delete') return 'Hapus Produk'
  if (log.entity_type === 'shifts' || log.entity_type === 'shift_handovers') return 'Shift'
  return auditCategoryLabel(log.category)
}

export function auditActivityLabel(log: Pick<AuditLog, 'description' | 'action' | 'entity_type' | 'actor_name'>) {
  const action = log.action.toLowerCase()
  const description = log.description.toLowerCase()
  if (action === 'login') return `${log.actor_name ?? 'Pengguna'} Login`
  if (action === 'logout') return `${log.actor_name ?? 'Pengguna'} Logout`
  if (action === 'check_in' || action.includes('masuk staf') || description.includes('shift masuk staf')) return 'Staff Masuk Shift'
  if (action === 'check_out' || action.includes('keluar staf') || description.includes('shift keluar staf')) return 'Staff Keluar Shift'
  if (action.startsWith('shift_handover_') || log.entity_type === 'shift_handovers' || description.includes('serah terima shift')) return 'Staff Serah Terima'
  return log.description
}

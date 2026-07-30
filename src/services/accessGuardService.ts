import { supabase } from '@/config/supabase'
import { useAuthStore } from '@/store/authStore'
import type { PermissionKey } from '@/types'

export const STAFF_SHIFT_REQUIRED_MESSAGE = 'Masuk shift dulu untuk melakukan transaksi.'

export async function ensurePermission(key: PermissionKey): Promise<void> {
  const { hasPermission } = useAuthStore.getState()
  if (!hasPermission(key)) {
    throw new Error('Anda tidak memiliki hak akses untuk aksi ini')
  }
}

export async function ensureStaffWriteAccess(permissionKey?: PermissionKey): Promise<void> {
  const { user, selectedBranch } = useAuthStore.getState()

  if (!user) {
    throw new Error('Session tidak valid')
  }

  // Jika ada permissionKey, cek dulu
  if (permissionKey) {
    const { hasPermission } = useAuthStore.getState()
    if (!hasPermission(permissionKey)) {
      throw new Error('Anda tidak memiliki hak akses untuk aksi ini')
    }
  }

  if (!selectedBranch?.id) {
    throw new Error(STAFF_SHIFT_REQUIRED_MESSAGE)
  }

  // Validate staff can access this branch
  const { isBranchAllowed } = useAuthStore.getState()
  if (!isBranchAllowed(selectedBranch.id)) {
    throw new Error('Anda tidak memiliki akses ke cabang ini')
  }

  const { data: activeShift, error } = await supabase
    .from('shifts')
    .select('id, branch_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!activeShift || activeShift.branch_id !== selectedBranch.id) {
    throw new Error(STAFF_SHIFT_REQUIRED_MESSAGE)
  }
}

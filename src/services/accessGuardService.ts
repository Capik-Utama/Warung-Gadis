import { supabase } from '@/config/supabase'
import { useAuthStore } from '@/store/authStore'
import { isBranchOperational } from '@/services/branchService'
import type { PermissionKey } from '@/types'

export const STAFF_SHIFT_REQUIRED_MESSAGE = 'Masuk shift dulu untuk melakukan transaksi.'
export const BRANCH_CLOSED_MESSAGE = 'Cabang sedang tutup. Transaksi tidak diizinkan.'

export async function ensurePermission(key: PermissionKey): Promise<void> {
  const { hasPermission } = useAuthStore.getState()
  if (!hasPermission(key)) {
    throw new Error('Anda tidak memiliki hak akses untuk aksi ini')
  }
}

export async function ensureStaffWriteAccess(permissionKey?: PermissionKey): Promise<void> {
  const { user, selectedBranch, isStaff } = useAuthStore.getState()

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

  // Developer and Manager don't need active shift to perform write operations
  if (isStaff()) {
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

  // Check if branch is operational
  const isOperational = await isBranchOperational(selectedBranch.id)
  if (!isOperational) {
    throw new Error(BRANCH_CLOSED_MESSAGE)
  }
}

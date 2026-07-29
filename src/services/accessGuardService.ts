import { supabase } from '@/config/supabase'
import { useAuthStore } from '@/store/authStore'

export const STAFF_SHIFT_REQUIRED_MESSAGE = 'Masuk shift dulu untuk melakukan transaksi.'

export async function ensureStaffWriteAccess(): Promise<void> {
  const { user, selectedBranch } = useAuthStore.getState()

  if (!user) {
    throw new Error('Session tidak valid')
  }

  if (user.role !== 'staff') {
    return
  }

  if (!selectedBranch?.id) {
    throw new Error(STAFF_SHIFT_REQUIRED_MESSAGE)
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

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Branch, PermissionKey, UserRole } from '@/types'
import { ROLE_DEFAULT_PERMISSIONS } from '@/permissions'

interface AuthStore {
  user: User | null
  selectedBranch: Branch | null
  permissions: PermissionKey[]
  allowedBranchIds: string[]
  setUser: (user: User | null) => void
  setSelectedBranch: (branch: Branch | null) => void
  setPermissions: (perms: PermissionKey[]) => void
  setAllowedBranchIds: (ids: string[]) => void
  logout: () => void
  hasPermission: (key: PermissionKey) => boolean
  isDeveloper: () => boolean
  isManager: () => boolean
  isStaff: () => boolean
  isBranchAllowed: (branchId: string) => boolean
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      selectedBranch: null,
      permissions: [],
      allowedBranchIds: [],

      setUser: (user) => set({ user }),
      setSelectedBranch: (branch) => set({ selectedBranch: branch }),
      setPermissions: (permissions) => set({ permissions }),
      setAllowedBranchIds: (allowedBranchIds) => set({ allowedBranchIds }),

      logout: () =>
        set({ user: null, selectedBranch: null, permissions: [], allowedBranchIds: [] }),

      hasPermission: (key) => {
        const { user, permissions } = get()
        if (!user) return false
        if (user.role === 'developer' || user.role === 'manager') return true
        
        // Check custom permissions first, then fallback to defaults for the role
        if (permissions.includes(key)) return true
        const defaults = ROLE_DEFAULT_PERMISSIONS[user.role as UserRole] || []
        return defaults.includes(key)
      },

      isDeveloper: () => get().user?.role === 'developer',
      isManager: () => get().user?.role === 'manager',
      isStaff: () => get().user?.role === 'staff',

      isBranchAllowed: (branchId: string) => {
        const { user, allowedBranchIds } = get()
        if (!user) return false
        // Developer & manager can access all branches
        if (user.role === 'developer' || user.role === 'manager') return true
        // Staff can only access branches in their allowed list
        return allowedBranchIds.includes(branchId)
      },
    }),
    {
      name: 'wg-auth',
      partialize: (state) => ({
        user: state.user,
        selectedBranch: state.selectedBranch,
        permissions: state.permissions,
        allowedBranchIds: state.allowedBranchIds,
      }),
    },
  ),
)

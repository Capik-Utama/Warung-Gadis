import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Branch, PermissionKey, UserRole } from '@/types'
import { ROLE_DEFAULT_PERMISSIONS } from '@/permissions'

type LoginMode = 'default' | 'manager' | 'staff'

interface AuthStore {
  user: User | null
  selectedBranch: Branch | null
  permissions: PermissionKey[]
  allowedBranchIds: string[]
  loginMode: LoginMode
  setUser: (user: User | null) => void
  setSelectedBranch: (branch: Branch | null) => void
  setPermissions: (perms: PermissionKey[]) => void
  setAllowedBranchIds: (ids: string[]) => void
  setLoginMode: (mode: LoginMode) => void
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
      loginMode: 'default',

      setUser: (user) => set({ user }),
      setSelectedBranch: (branch) => set({ selectedBranch: branch }),
      setPermissions: (permissions) => set({ permissions }),
      setAllowedBranchIds: (allowedBranchIds) => set({ allowedBranchIds }),
      setLoginMode: (loginMode) => set({ loginMode }),

      logout: () =>
        set({ user: null, selectedBranch: null, permissions: [], allowedBranchIds: [], loginMode: 'default' }),

      hasPermission: (key) => {
        const { user, permissions, loginMode } = get()
        if (!user) return false
        if (user.role === 'developer') return true
        if (user.role === 'manager' && loginMode !== 'staff') return true

        if (permissions.includes(key)) return true
        const effectiveRole: UserRole = user.role === 'manager' && loginMode === 'staff' ? 'staff' : user.role
        const defaults = ROLE_DEFAULT_PERMISSIONS[effectiveRole] || []
        return defaults.includes(key)
      },

      isDeveloper: () => get().user?.role === 'developer',
      isManager: () => {
        const { user, loginMode } = get()
        return user?.role === 'manager' && loginMode !== 'staff'
      },
      isStaff: () => {
        const { user, loginMode } = get()
        return user?.role === 'staff' || (user?.role === 'manager' && loginMode === 'staff')
      },

      isBranchAllowed: (branchId: string) => {
        const { user, allowedBranchIds, loginMode } = get()
        if (!user) return false
        if (user.role === 'developer') return true
        if (user.role === 'manager' && loginMode !== 'staff') return true
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
        loginMode: state.loginMode,
      }),
    },
  ),
)

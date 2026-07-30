import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Branch, PermissionKey, UserRole } from '@/types'
import { ROLE_DEFAULT_PERMISSIONS } from '@/permissions'

interface AuthStore {
  user: User | null
  selectedBranch: Branch | null
  permissions: PermissionKey[]
  setUser: (user: User | null) => void
  setSelectedBranch: (branch: Branch | null) => void
  setPermissions: (perms: PermissionKey[]) => void
  logout: () => void
  hasPermission: (key: PermissionKey) => boolean
  isDeveloper: () => boolean
  isManager: () => boolean
  isStaff: () => boolean
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      selectedBranch: null,
      permissions: [],

      setUser: (user) => set({ user }),
      setSelectedBranch: (branch) => set({ selectedBranch: branch }),
      setPermissions: (permissions) => set({ permissions }),

      logout: () =>
        set({ user: null, selectedBranch: null, permissions: [] }),

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
    }),
    {
      name: 'wg-auth',
      partialize: (state) => ({
        user: state.user,
        selectedBranch: state.selectedBranch,
        permissions: state.permissions,
      }),
    },
  ),
)

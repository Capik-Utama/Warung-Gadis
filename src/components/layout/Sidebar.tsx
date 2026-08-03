import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, Package, Tag, BarChart3,
  Users, GitBranch, Settings, Database, Palette, Clock,
  TrendingUp, CreditCard, LogOut, ChevronLeft, ChevronRight,
  AlertTriangle, X,
} from 'lucide-react'
import { AppLogo, WGLogo } from '@/components/shared/Logo'
import { useAuthStore } from '@/store/authStore'
import { ROLE_MENUS, MENU_PERMISSIONS } from '@/permissions'

interface NavItem {
  key: string
  label: string
  path: string
  icon: React.ReactNode
}

const ALL_NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/', icon: <LayoutDashboard size={18} /> },
  { key: 'kasir', label: 'Kasir', path: '/kasir', icon: <ShoppingCart size={18} /> },
  { key: 'produk', label: 'Produk', path: '/produk', icon: <Package size={18} /> },
  { key: 'kategori', label: 'Kategori', path: '/kategori', icon: <Tag size={18} /> },
  { key: 'stok', label: 'Stok', path: '/stok', icon: <BarChart3 size={18} /> },
  { key: 'transaksi', label: 'Transaksi', path: '/transaksi', icon: <CreditCard size={18} /> },
  { key: 'hutang', label: 'Member', path: '/member', icon: <AlertTriangle size={18} /> },
  { key: 'laporan', label: 'Laporan', path: '/laporan', icon: <TrendingUp size={18} /> },
  { key: 'shift', label: 'Shift', path: '/shift', icon: <Clock size={18} /> },
  { key: 'user', label: 'User', path: '/user', icon: <Users size={18} /> },
  { key: 'cabang', label: 'Cabang', path: '/cabang', icon: <GitBranch size={18} /> },
  { key: 'pengaturan', label: 'Pengaturan', path: '/pengaturan', icon: <Settings size={18} /> },
  { key: 'backup', label: 'Backup', path: '/backup', icon: <Database size={18} /> },
  { key: 'theme', label: 'Tema', path: '/theme', icon: <Palette size={18} /> },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, mobileOpen, onMobileClose }) => {
  const { user, logout, hasPermission } = useAuthStore()
  const navigate = useNavigate()

  const roleAllowedKeys = ROLE_MENUS[user?.role ?? 'staff'] ?? []
  const navItems = ALL_NAV_ITEMS.filter((item) => {
    // Check if allowed by role
    if (roleAllowedKeys.includes(item.key)) return true

    // Check if allowed by specific permissions
    const requiredPerms = MENU_PERMISSIONS[item.key]
    if (requiredPerms && requiredPerms.some(p => hasPermission(p))) return true

    return false
  })

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const sidebarContent = (
    <div
      className="flex flex-col h-full"
      style={{ background: 'var(--bg-sidebar)' }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        {!collapsed ? (
          <AppLogo size={36} showName />
        ) : (
          <AppLogo size={36} showName={false} />
        )}
        <button
          onClick={onToggle}
          className="hidden md:flex p-1 rounded-lg opacity-70 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--text-sidebar)' }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Branch indicator */}
      {!collapsed && (
        <div className="px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <p className="text-xs opacity-50" style={{ color: 'var(--text-sidebar)' }}>Cabang</p>
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-sidebar)' }}>
            {useAuthStore.getState().selectedBranch?.name ?? 'Semua Cabang'}
          </p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.key}
            to={item.path}
            end={item.path === '/'}
            onClick={onMobileClose}
            className={({ isActive }) =>
              `sidebar-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center' : ''}`
            }
            title={collapsed ? item.label : undefined}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="p-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        {!collapsed && (
          <div className="px-3 py-2 mb-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-sidebar)' }}>
              {user?.name}
            </p>
            <p className="text-xs capitalize opacity-70" style={{ color: 'var(--text-sidebar)' }}>
              {user?.role}
            </p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`sidebar-item w-full text-red-300 hover:text-red-200 ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={18} />
          {!collapsed && <span>Keluar</span>}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={onMobileClose}
          className="absolute top-4 right-4 text-white opacity-70 hover:opacity-100"
        >
          <X size={20} />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col flex-shrink-0 transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
        style={{ background: 'var(--bg-sidebar)' }}
      >
        {sidebarContent}
      </aside>
    </>
  )
}

export const MobileMenuButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="md:hidden rounded-xl transition-colors"
    style={{ color: 'var(--text-primary)' }}
  >
    <WGLogo size={45} />
  </button>
)

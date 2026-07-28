import React from 'react'
import { Bell, Search, LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

interface TopbarProps {
  title: string
  onMenuClick: () => void
  mobileMenuButton: React.ReactNode
}

export const Topbar: React.FC<TopbarProps> = ({ title, mobileMenuButton }) => {
  const navigate = useNavigate()
  const { user, selectedBranch, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    toast.success('Berhasil keluar')
    navigate('/login')
  }

  return (
    <header
      className="flex items-center justify-between px-4 py-3 border-b"
      style={{
        background: 'var(--bg-topbar)',
        borderColor: 'var(--border-color)',
        boxShadow: '0 1px 4px var(--shadow-color)',
      }}
    >
      <div className="flex items-center gap-3">
        {mobileMenuButton}
        <div>
          <h1 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h1>
          {selectedBranch && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {selectedBranch.name}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="p-2 rounded-xl transition-colors hover:bg-opacity-10"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Search size={18} />
        </button>
        <button
          className="relative p-2 rounded-xl transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
          style={{ background: 'var(--bg-primary)' }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: 'var(--accent-primary)' }}
          >
            {user?.name?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              {user?.name}
            </p>
            <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>
              {user?.role}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 rounded-xl transition-colors text-red-500 hover:bg-red-50"
          title="Keluar"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}

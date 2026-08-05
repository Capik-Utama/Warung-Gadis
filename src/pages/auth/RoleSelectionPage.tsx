import React from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutDashboard, ShoppingCart, LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { WGLogo } from '@/components/shared/Logo'

export default function RoleSelectionPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleSelectManager = () => {
    navigate('/')
  }

  const handleSelectStaff = () => {
    navigate('/select-branch')
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (!user || (user.role !== 'manager' && user.role !== 'developer')) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <WGLogo size={100} className="shadow-xl" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Pilih Peran
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Selamat datang kembali, {user.name}. Silakan pilih mode akses Anda.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 mb-8">
          <button
            onClick={handleSelectManager}
            className="card p-8 text-center transition-all hover:scale-[1.02] hover:shadow-xl group relative overflow-hidden flex flex-col items-center gap-4"
          >
            <div className="p-5 rounded-3xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
              <LayoutDashboard size={48} />
            </div>
            <div>
              <h3 className="font-bold text-xl mb-2" style={{ color: 'var(--text-primary)' }}>
                Mode Manager
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Pantau laporan, kelola stok, dan atur operasional warung.
              </p>
            </div>
          </button>

          <button
            onClick={handleSelectStaff}
            className="card p-8 text-center transition-all hover:scale-[1.02] hover:shadow-xl group relative overflow-hidden flex flex-col items-center gap-4"
          >
            <div className="p-5 rounded-3xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
              <ShoppingCart size={48} />
            </div>
            <div>
              <h3 className="font-bold text-xl mb-2" style={{ color: 'var(--text-primary)' }}>
                Mode Kasir
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Langsung ke menu kasir untuk melayani transaksi pelanggan.
              </p>
            </div>
          </button>
        </div>

        <div className="flex justify-center">
          <Button variant="secondary" icon={<LogOut size={16} />} onClick={handleLogout}>
            Keluar dari Akun
          </Button>
        </div>
      </div>
    </div>
  )
}

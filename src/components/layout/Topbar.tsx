import React, { useState } from 'react'
import { Bell, Search, LogOut, Clock, LogIn, Palette, Store, ShieldCheck, X } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { WGLogo } from '@/components/shared/Logo'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { closeAllShifts } from '@/services/shiftService'
import { loginUser } from '@/services/userService'

interface TopbarProps {
  title: string
  onMenuClick: () => void
  mobileMenuButton: React.ReactNode
}

export const Topbar: React.FC<TopbarProps> = ({ title, mobileMenuButton }) => {
  const navigate = useNavigate()
  const { user, selectedBranch, logout } = useAuthStore()
  const [showMenu, setShowMenu] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogout = () => {
    logout()
    toast.success('Berhasil keluar')
    navigate('/login')
  }

  const handleCloseWarung = async () => {
    if (!password) {
      toast.error('Masukkan password konfirmasi')
      return
    }
    if (!selectedBranch) {
      toast.error('Pilih cabang terlebih dahulu')
      return
    }

    setLoading(true)
    try {
      // Verifikasi password dengan login ulang (simulasi verifikasi)
      await loginUser({ name: user?.name || '', password })
      
      // Tutup semua shift di cabang ini
      await closeAllShifts(selectedBranch.id)
      
      toast.success('Warung Berhasil Ditutup. Semua shift telah diakhiri.')
      setShowCloseModal(false)
      setPassword('')
      setShowMenu(false)
    } catch (err) {
      toast.error('Password salah! Tutup warung dibatalkan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <header
      className="flex items-center justify-between px-4 py-3 border-b sticky top-0 z-30"
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

      <div className="flex items-center gap-3">
        <WGLogo size={32} className="hidden md:block" />
        <button
          className="p-2 rounded-xl transition-colors hover:bg-opacity-10"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Search size={18} />
        </button>
        
        {/* Navigasi Cepat Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all hover:shadow-soft border"
            style={{ 
              background: 'var(--bg-primary)',
              borderColor: showMenu ? 'var(--accent-primary)' : 'var(--border-color)'
            }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: 'var(--accent-primary)' }}
            >
              {user?.name?.charAt(0).toUpperCase() ?? 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                {user?.name}
              </p>
              <p className="text-[10px] capitalize opacity-70" style={{ color: 'var(--text-muted)' }}>
                {user?.role}
              </p>
            </div>
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div 
                className="absolute right-0 mt-2 w-64 rounded-2xl shadow-xl border z-50 overflow-hidden animate-slide-up"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              >
                <div className="p-3 space-y-2">
                  <button
                    onClick={() => { navigate('/shift'); setShowMenu(false); }}
                    className="w-full flex items-center gap-3 p-4 rounded-xl transition-colors hover:bg-green-50 text-green-600 border border-green-100"
                    style={{ background: 'rgba(34,197,94,0.05)' }}
                  >
                    <LogIn size={24} />
                    <div className="text-left">
                      <p className="font-bold text-lg leading-tight">MASUK</p>
                      <p className="text-[10px] opacity-70">Mulai Shift Baru</p>
                    </div>
                  </button>

                  <button
                    onClick={() => { navigate('/shift'); setShowMenu(false); }}
                    className="w-full flex items-center gap-3 p-4 rounded-xl transition-colors hover:bg-amber-50 text-amber-600 border border-amber-100"
                    style={{ background: 'rgba(245,158,11,0.05)' }}
                  >
                    <LogOut size={24} />
                    <div className="text-left">
                      <p className="font-bold text-lg leading-tight">PULANG</p>
                      <p className="text-[10px] opacity-70">Serah Terima Shift</p>
                    </div>
                  </button>

                  <div className="h-px my-2" style={{ background: 'var(--border-color)' }} />

                  <button
                    onClick={() => { navigate('/theme'); setShowMenu(false); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-gray-100"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <Palette size={18} className="opacity-70" />
                    <span className="text-sm font-medium">Ganti Tema</span>
                  </button>

                  {(user?.role === 'developer' || user?.role === 'manager') && (
                    <button
                      onClick={() => setShowCloseModal(true)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-red-50 text-red-600"
                    >
                      <Store size={18} />
                      <span className="text-sm font-medium">Tutup Warung</span>
                    </button>
                  )}

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-red-50 text-red-500"
                  >
                    <LogOut size={18} />
                    <span className="text-sm font-medium">Logout</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal Konfirmasi Tutup Warung */}
      <Modal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        title="Konfirmasi Tutup Warung"
        footer={
          <div className="flex gap-2 w-full">
            <Button variant="secondary" className="flex-1" onClick={() => setShowCloseModal(false)}>Batal</Button>
            <Button 
              variant="danger" 
              className="flex-1" 
              loading={loading}
              onClick={handleCloseWarung}
              icon={<ShieldCheck size={18} />}
            >
              Ya, Tutup Warung
            </Button>
          </div>
        }
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle size={32} />
          </div>
          <div>
            <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Anda Yakin?</p>
            <p className="text-sm px-4" style={{ color: 'var(--text-muted)' }}>
              Tindakan ini akan mengakhiri seluruh shift yang sedang aktif di cabang <strong>{selectedBranch?.name}</strong> secara paksa.
            </p>
          </div>
          <div className="text-left">
            <Input
              label="Konfirmasi Password Anda"
              type="password"
              placeholder="Masukkan password untuk melanjutkan"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>
        </div>
      </Modal>
    </header>
  )
}

// Tambahkan ikon AlertCircle yang belum diimport
const AlertCircle = ({ size, className }: { size: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
)

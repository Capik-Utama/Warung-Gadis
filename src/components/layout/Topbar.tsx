import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bell, Home, LogOut, Clock, LogIn, Palette, Store, ShieldCheck, X, Store as StoreOpen } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { WGLogo } from '@/components/shared/Logo'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { closeAllShifts, checkInShift, getActiveShift } from '@/services/shiftService'
import { loginUser } from '@/services/userService'
import { fetchBranches, setBranchOperational } from '@/services/branchService'
import type { Branch } from '@/types'

interface TopbarProps {
  title: string
  onMenuClick: () => void
  mobileMenuButton: React.ReactNode
}

export const Topbar: React.FC<TopbarProps> = ({ title, mobileMenuButton }) => {
  const navigate = useNavigate()
  const { user, selectedBranch, allowedBranchIds, logout, setSelectedBranch } = useAuthStore()
  const [showMenu, setShowMenu] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [showOpenModal, setShowOpenModal] = useState(false)
  const [password, setPassword] = useState('')
  const [closeBranchId, setCloseBranchId] = useState('')
  const [openBranchId, setOpenBranchId] = useState('')
  const [branches, setBranches] = useState<Branch[]>([])
  const [branchesLoading, setBranchesLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const isStaff = user?.role === 'staff'

  const { data: activeShift } = useQuery({
    queryKey: ['active-shift', user?.id],
    queryFn: () => getActiveShift(user!.id),
    enabled: !!user && isStaff,
    refetchInterval: 30_000,
  })

  const isStaffReadOnly = isStaff && !activeShift

  // Load branches when modal opens
  const loadBranches = async () => {
    setBranchesLoading(true)
    try {
      const list = await fetchBranches()
      setBranches(list)
    } catch (err) {
      toast.error('Gagal memuat daftar cabang')
    } finally {
      setBranchesLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    toast.success('Berhasil keluar')
    navigate('/login')
  }

  const handleOpenCloseModal = (type: 'close' | 'open') => {
    setCloseBranchId(selectedBranch?.id ?? '')
    setOpenBranchId(selectedBranch?.id ?? '')
    setPassword('')
    loadBranches()
    if (type === 'close') {
      setShowCloseModal(true)
    } else {
      setShowOpenModal(true)
    }
    setShowMenu(false)
  }

  const handleCloseWarung = async () => {
    if (!password) {
      toast.error('Masukkan password konfirmasi')
      return
    }
    const branchId = closeBranchId || selectedBranch?.id
    if (!branchId) {
      toast.error('Pilih cabang terlebih dahulu')
      return
    }

    setLoading(true)
    try {
      // Verifikasi password dengan login ulang (simulasi verifikasi)
      await loginUser({ name: user?.name || '', password })
      
      // Tutup semua shift di cabang ini
      await closeAllShifts(branchId)
      
      // Tandai cabang sebagai tidak operasional (tutup)
      await setBranchOperational(branchId, false)
      
      toast.success('Warung Berhasil Ditutup. Semua shift telah diakhiri dan cabang ditutup.')
      setShowCloseModal(false)
      setPassword('')
    } catch (err: any) {
      const msg = err?.message || ''
      if (msg.includes('password salah')) {
        toast.error('Password salah! Tutup warung dibatalkan.')
      } else {
        toast.error(`Gagal menutup warung: ${msg}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleBukaWarung = async () => {
    if (!password) {
      toast.error('Masukkan password konfirmasi')
      return
    }
    const branchId = openBranchId || selectedBranch?.id
    if (!branchId) {
      toast.error('Pilih cabang terlebih dahulu')
      return
    }
    if (!user) {
      toast.error('User tidak ditemukan')
      return
    }

    setLoading(true)
    try {
      // Verifikasi password
      await loginUser({ name: user.name, password })
      
      // Tandai cabang sebagai operasional (buka)
      await setBranchOperational(branchId, true)
      
      // Buat shift baru (check-in)
      // Gunakan skipOperationalCheck=true karena kita baru saja membukanya
      await checkInShift(user.id, branchId, true)
      
      // Set cabang terpilih
      const branch = branches.find(b => b.id === branchId)
      if (branch) setSelectedBranch(branch)
      
      toast.success('Warung Berhasil Dibuka! Cabang dibuka dan shift baru dimulai.')
      setShowOpenModal(false)
      setPassword('')
    } catch (err: any) {
      const msg = err?.message || ''
      if (msg.includes('password salah')) {
        toast.error('Password salah! Buka warung dibatalkan.')
      } else {
        toast.error(`Gagal membuka warung: ${msg}`)
      }
    } finally {
      setLoading(false)
    }
  }

  // Filter branches: show operational status
  const allowedBranches = useMemo(() => {
    if (!user) return []
    if (user.role === 'developer' || user.role === 'manager') return branches
    return branches.filter(b => allowedBranchIds.includes(b.id))
  }, [branches, user, allowedBranchIds])
  const branchOptions = allowedBranches.map(b => ({
    value: b.id,
    label: `${b.name}${b.is_operational ? '' : ' (TUTUP)'}`
  }))
  // For open-warung modal, only show branches that can be opened (currently closed but active)
  const openableBranches = allowedBranches.filter(b => !b.is_operational)
  const openBranchOptions = openableBranches.map(b => ({ value: b.id, label: b.name }))
  // For close-warung modal, only show branches that are currently open
  const closeableBranches = allowedBranches.filter(b => b.is_operational)
  const closeBranchOptions = closeableBranches.map(b => ({ value: b.id, label: b.name }))

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
        <div className="hidden md:block">
          <WGLogo size={30} />
        </div>
        <div>
          <h1 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            {title}
            {isStaffReadOnly && (
              <button
                type="button"
                onClick={() => navigate('/shift')}
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full border"
                  style={{ 
                    borderColor: 'var(--warning)', 
                    background: 'rgba(245,158,11,0.15)', 
                    color: 'var(--warning)'
                  }}
              >
                (Read Only)
              </button>
            )}
          </h1>
          {selectedBranch && (
            <p className="text-xs flex items-center gap-2">
              <span style={{ color: 'var(--text-secondary)' }}>
                {selectedBranch.name}
              </span>
              {selectedBranch.is_operational ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                  style={{ borderColor: 'var(--success)', background: 'rgba(34,197,94,0.15)', color: 'var(--success)' }}>
                  BUKA
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                  style={{ borderColor: 'var(--danger)', background: 'rgba(239,68,68,0.15)', color: 'var(--danger)' }}>
                  TUTUP
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-xl transition-all hover:shadow-soft border"
          style={{ color: 'var(--text-secondary)', background: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
          title="Beranda"
        >
          <Home size={35} />
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
              className="w-[35px] h-[35px] rounded-full flex items-center justify-center text-white text-xs font-bold"
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
                    className="w-full flex items-center gap-3 p-4 rounded-xl transition-colors border"
                    style={{ 
                      background: 'rgba(34,197,94,0.05)', 
                      color: 'var(--success)',
                      borderColor: 'rgba(34,197,94,0.2)'
                    }}
                  >
                    <LogIn size={24} />
                    <div className="text-left">
                      <p className="font-bold text-lg leading-tight">MASUK</p>
                      <p className="text-[10px] opacity-70">Mulai Shift Baru</p>
                    </div>
                  </button>

                  <button
                    onClick={() => { navigate('/shift'); setShowMenu(false); }}
                    className="w-full flex items-center gap-3 p-4 rounded-xl transition-colors border"
                    style={{ 
                      background: 'rgba(245,158,11,0.05)', 
                      color: 'var(--warning)',
                      borderColor: 'rgba(245,158,11,0.2)'
                    }}
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
                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <Palette size={18} className="opacity-70" />
                    <span className="text-sm font-medium">Ganti Tema</span>
                  </button>

                  {(user?.role === 'developer' || user?.role === 'manager') && (
                    <>
                      <button
                        onClick={() => handleOpenCloseModal('open')}
                        className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors"
                        style={{ color: 'var(--success)' }}
                      >
                        <StoreOpen size={18} />
                        <span className="text-sm font-medium">Buka Warung</span>
                      </button>
                      <button
                        onClick={() => handleOpenCloseModal('close')}
                        className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors"
                        style={{ color: 'var(--danger)' }}
                      >
                        <Store size={18} />
                        <span className="text-sm font-medium">Tutup Warung</span>
                      </button>
                    </>
                  )}

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors"
                    style={{ color: 'var(--danger)' }}
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

      {/* Modal Konfirmasi Buka Warung */}
      <Modal
        isOpen={showOpenModal}
        onClose={() => setShowOpenModal(false)}
        title="Konfirmasi Buka Warung"
        footer={
          <div className="flex gap-2 w-full">
            <Button variant="secondary" className="flex-1" onClick={() => setShowOpenModal(false)}>Batal</Button>
            <Button 
              variant="success" 
              className="flex-1" 
              loading={loading}
              onClick={handleBukaWarung}
              icon={<StoreOpen size={18} />}
            >
              Ya, Buka Warung
            </Button>
          </div>
        }
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--success)' }}>
            <StoreOpen size={32} />
          </div>
          <div>
            <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Buka Warung</p>
            <p className="text-sm px-4" style={{ color: 'var(--text-secondary)' }}>
              Pilih cabang dan mulai shift baru untuk membuka warung.
            </p>
          </div>
          <div className="text-left space-y-3">
            <Select
              label="Pilih Cabang yang Ditutup"
              value={openBranchId}
              onChange={(e) => setOpenBranchId(e.target.value)}
              options={openBranchOptions}
              placeholder="Pilih cabang yang ingin dibuka..."
            />
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
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--danger)' }}>
            <AlertCircle size={32} />
          </div>
          <div>
            <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Anda Yakin?</p>
            <p className="text-sm px-4" style={{ color: 'var(--text-secondary)' }}>
              Tindakan ini akan mengakhiri seluruh shift yang sedang aktif di cabang secara paksa.
            </p>
          </div>
          <div className="text-left space-y-3">
            <Select
              label="Pilih Cabang yang Sedang Buka"
              value={closeBranchId}
              onChange={(e) => setCloseBranchId(e.target.value)}
              options={closeBranchOptions}
              placeholder="Pilih cabang yang ingin ditutup..."
            />
            <Input
              label="Konfirmasi Password Anda"
              type="password"
              placeholder="Masukkan password untuk melanjutkan"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

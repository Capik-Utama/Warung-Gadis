import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Coffee } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { fetchBranches } from '@/services/branchService'
import { loginUser } from '@/services/userService'
import { supabase } from '@/config/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { WGLogo } from '@/components/shared/Logo'
import type { Branch } from '@/types'

type Step = 'login' | 'branch'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setUser, setSelectedBranch, setPermissions } = useAuthStore()

  const [step, setStep] = useState<Step>('login')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [tempUser, setTempUser] = useState<ReturnType<typeof useAuthStore.getState>['user']>(null)
  const [tempPerms, setTempPerms] = useState<string[]>([])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !password.trim()) {
      toast.error('Nama dan password wajib diisi')
      return
    }
    setLoading(true)
    try {
      const { user, permissions } = await loginUser({ name: name.trim(), password })
      
      // Jika Developer atau Manager, langsung masuk tanpa pilih cabang
      if (user.role === 'developer' || user.role === 'manager') {
        setUser(user)
        setPermissions(permissions as any)
        setSelectedBranch(null) // null berarti semua cabang
        toast.success(`Selamat datang, ${user.name}!`)
        navigate('/')
        return
      }

      // Jika Staff, harus pilih cabang
      setTempUser(user)
      setTempPerms(permissions)
      const branchList = await fetchBranches()
      setBranches(branchList)
      setStep('branch')
    } catch {
      toast.error('Nama atau password salah')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectBranch = (branch: Branch | null) => {
    if (!tempUser) return
    setUser(tempUser)
    setPermissions(tempPerms as Parameters<typeof setPermissions>[0])
    setSelectedBranch(branch)
    toast.success(`Selamat datang, ${tempUser.name}!`)
    navigate('/')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <WGLogo size={80} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            WG POS
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Ngopi • Nongkrong • Karaoke • Nobar
          </p>
        </div>

        {step === 'login' ? (
          <div className="card p-6 animate-slide-up">
            <h2 className="text-lg font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
              Masuk ke Akun
            </h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                label="Nama"
                type="text"
                placeholder="Masukkan nama Anda"
                value={name}
                onChange={(e) => setName(e.target.value)}
                leftIcon={<Coffee size={16} />}
                autoFocus
              />
              <div className="relative">
                <Input
                  label="Password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="p-1"
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                className="w-full mt-2"
                loading={loading}
                size="lg"
              >
                Masuk
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-dashed" style={{ borderColor: 'var(--border-color)' }}>
              <p className="text-center text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Akses Darurat</p>
              <Button
                variant="secondary"
                className="w-full text-blue-500 border-blue-200"
                onClick={async () => {
                  setLoading(true);
                  try {
                    // Direct login bypass for Capik
                    const { data } = await supabase.from('users').select('*').eq('name', 'Capik').single();
                    if (data) {
                      setUser(data);
                      setPermissions(['add_product', 'edit_product', 'delete_product', 'add_stock', 'input_expense', 'buy_gas', 'take_cash', 'edit_price', 'export_data', 'import_data', 'view_report', 'view_all_branches', 'manage_users', 'manage_branches', 'manage_categories', 'manage_suppliers', 'delete_transaction', 'backup_restore'] as any);
                      setSelectedBranch(null);
                      toast.success('Login Darurat Berhasil!');
                      navigate('/');
                    } else {
                      toast.error('Akun Capik tidak ditemukan di database. Silakan jalankan /setup-database dulu.');
                    }
                  } catch (e: any) {
                    toast.error(e.message);
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Login sebagai Capik (Developer)
              </Button>
            </div>
          </div>
        ) : (
          <div className="card p-6 animate-slide-up">
            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Pilih Cabang
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              Pilih cabang tempat Anda bertugas
            </p>
            <div className="space-y-2">
              {branches.map((branch) => (
                <button
                  key={branch.id}
                  onClick={() => handleSelectBranch(branch)}
                  className="w-full text-left p-4 rounded-xl border transition-all hover:border-blue-400 hover:shadow-soft"
                  style={{
                    background: 'var(--bg-primary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <p className="font-semibold">{branch.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {branch.address}
                  </p>
                </button>
              ))}
              {tempUser?.role === 'developer' && (
                <button
                  onClick={() => handleSelectBranch(null)}
                  className="w-full text-left p-4 rounded-xl border-2 border-dashed transition-all hover:border-blue-400"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
                >
                  <p className="font-semibold">Semua Cabang</p>
                  <p className="text-xs mt-0.5">Lihat seluruh data</p>
                </button>
              )}
            </div>
          </div>
        )}

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
          © 2025 WG POS – Warung Gadis
        </p>
      </div>
    </div>
  )
}

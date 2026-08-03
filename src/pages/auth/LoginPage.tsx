import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Coffee } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { loginUser, fetchUserBranches } from '@/services/userService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { WGLogo } from '@/components/shared/Logo'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setUser, setSelectedBranch, setPermissions, setAllowedBranchIds } = useAuthStore()

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !password.trim()) {
      toast.error('Nama dan password wajib diisi')
      return
    }
    setLoading(true)
    try {
      const { user, permissions } = await loginUser({ name: name.trim(), password })

      setUser(user)
      setPermissions(permissions as any)
      setSelectedBranch(null)
      if (user.role === 'staff') {
        try {
          const userBranches = await fetchUserBranches(user.id)
          setAllowedBranchIds(userBranches.map(ub => ub.branch_id))
        } catch {
          setAllowedBranchIds([])
        }
      } else {
        setAllowedBranchIds([])
      }
      toast.success(`Selamat datang, ${user.name}!`)
      if (user.role === 'staff') {
        navigate('/select-branch')
      } else {
        navigate('/')
      }
    } catch {
      toast.error('Nama atau password salah')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <WGLogo size={140} className="shadow-2xl" style={{ filter: 'drop-shadow(0 8px 24px rgba(99,102,241,0.4))' }} />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Warung Gadis
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Ngopi • Nongkrong • Karaoke • Nobar
          </p>
        </div>

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
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
          © 2026 Warung Gadis - By Capik
        </p>
      </div>
    </div>
  )
}

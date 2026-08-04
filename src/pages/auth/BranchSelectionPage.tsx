import React, { useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { GitBranch, LogOut, Coffee } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { fetchBranches } from '@/services/branchService'
import { Button } from '@/components/ui/Button'
import { WGLogo } from '@/components/shared/Logo'
import type { Branch } from '@/types'

export default function BranchSelectionPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo: string = (location.state as any)?.returnTo ?? '/'
  const { user, allowedBranchIds, setSelectedBranch, logout, isManager } = useAuthStore()

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: fetchBranches,
  })

  const filteredBranches = useMemo(() => {
    if (!user) return []
    if (user.role === 'developer' || isManager()) {
      // Developer & manager can see all active branches
      return branches.filter((b) => b.is_active)
    }
    // Staff can only see branches they have access to AND that are active
    return branches.filter((b) => allowedBranchIds.includes(b.id) && b.is_active)
  }, [branches, user, allowedBranchIds, isManager])

  const handleSelect = (branch: Branch) => {
    if (!branch.is_operational) {
      toast.error(`Cabang ${branch.name} sedang tutup (tidak operasional)`)
      return
    }
    setSelectedBranch(branch)
    toast.success(`Cabang ${branch.name} dipilih`)
    navigate(returnTo, { replace: true })
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <span className="loading-spinner" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <WGLogo size={100} className="shadow-xl" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Pilih Cabang
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Silakan pilih cabang tempat Anda bertugas hari ini
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {filteredBranches.length > 0 ? (
            filteredBranches.map((b) => (
              <button
                key={b.id}
                onClick={() => handleSelect(b)}
                className="card p-5 text-left transition-all hover:scale-[1.02] hover:shadow-lg group relative overflow-hidden"
                style={{ opacity: b.is_operational ? 1 : 0.6 }}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <GitBranch size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                      {b.name}
                    </h3>
                    <p className="text-xs line-clamp-1" style={{ color: 'var(--text-muted)' }}>
                      {b.address || 'Alamat tidak tersedia'}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`badge ${b.is_operational ? 'badge-green' : 'badge-red'}`}>
                        {b.is_operational ? 'OPERASIONAL' : 'TUTUP'}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="col-span-full card p-10 text-center">
              <div className="flex justify-center mb-3 text-amber-500">
                <Coffee size={48} />
              </div>
              <p style={{ color: 'var(--text-secondary)' }}>
                Anda tidak memiliki akses ke cabang manapun atau tidak ada cabang aktif.
              </p>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                Hubungi administrator untuk bantuan.
              </p>
            </div>
          )}
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

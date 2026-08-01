import React, { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, LogIn, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'
import { checkInShift, getActiveShift, autoHandover, getAllActiveShifts, fetchShiftHistory } from '@/services/shiftService'
import { fetchBranches, fetchOperationalBranches } from '@/services/branchService'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { formatDateTime } from '@/utils/format'
import { useAuthStore } from '@/store/authStore'
import type { Shift, Branch } from '@/types'

export default function ShiftPage() {
  const { user, selectedBranch, allowedBranchIds, setSelectedBranch } = useAuthStore()
  const qc = useQueryClient()
  const branchId = selectedBranch?.id ?? ''
  const [checkInBranchId, setCheckInBranchId] = useState(branchId)

  const [handoverModal, setHandoverModal] = useState(false)
  const [replaceUserId, setReplaceUserId] = useState('')

  const { data: activeShift } = useQuery({
    queryKey: ['active-shift', user?.id],
    queryFn: () => getActiveShift(user!.id),
    enabled: !!user,
    refetchInterval: 30_000,
  })

  const { data: allActive = [] } = useQuery({
    queryKey: ['all-active-shifts', branchId],
    queryFn: () => getAllActiveShifts(branchId),
    enabled: !!branchId,
  })

  const { data: history = [] } = useQuery({
    queryKey: ['shift-history', branchId],
    queryFn: () => fetchShiftHistory(branchId),
    enabled: !!branchId,
  })

  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: fetchBranches })

  // Filter branches for staff: only show allowed branches that are operational
  const filteredBranches: Branch[] = useMemo(() => {
    if (!user) return []
    if (user.role === 'developer' || user.role === 'manager') {
      // Developer & manager can see all branches but only check-in to operational ones
      return branches.filter(b => b.is_operational)
    }
    // Staff can only see branches they have access to AND that are operational
    return branches.filter(b => allowedBranchIds.includes(b.id) && b.is_operational)
  }, [branches, user, allowedBranchIds])

  useEffect(() => {
    if (branchId && !checkInBranchId) {
      setCheckInBranchId(branchId)
    }
  }, [branchId, checkInBranchId])

  useEffect(() => {
    if (!selectedBranch && activeShift?.branch && branches.length > 0) {
      const fullBranch = branches.find(b => b.id === activeShift.branch.id)
      if (fullBranch) setSelectedBranch(fullBranch)
      else setSelectedBranch(activeShift.branch) // Fallback
    }
  }, [selectedBranch, activeShift, branches, setSelectedBranch])

  // Staf lain yang sedang aktif di cabang yang sama
  const otherActiveUsers = allActive.filter(s => s.user_id !== user?.id)

  const checkInMutation = useMutation({
    mutationFn: () => {
      const targetBranchId = checkInBranchId || branchId
      if (!user || !targetBranchId) throw new Error('Pilih cabang dulu untuk masuk shift')
      return checkInShift(user.id, targetBranchId)
    },
    onSuccess: () => {
      const targetBranchId = checkInBranchId || branchId
      const branch = branches.find((b) => b.id === targetBranchId)
      if (branch) setSelectedBranch(branch)
      toast.success('Shift dimulai!')
      qc.invalidateQueries({ queryKey: ['active-shift'] })
      qc.invalidateQueries({ queryKey: ['all-active-shifts'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handoverMutation = useMutation({
    mutationFn: () => {
      if (!activeShift || !user) throw new Error('Tidak ada shift aktif')
      if (!replaceUserId) throw new Error('Pilih staf pengganti')
      return autoHandover({
        fromShiftId: activeShift.id,
        fromUserId: user.id,
        toUserId: replaceUserId,
        branchId,
        systemCash: activeShift.system_cash || 0,
        actualCash: activeShift.system_cash || 0,
        notes: '',
      })
    },
    onSuccess: () => {
      toast.success('Shift berhasil diserahkan, tanggung jawab berpindah!')
      qc.invalidateQueries({ queryKey: ['active-shift'] })
      qc.invalidateQueries({ queryKey: ['all-active-shifts'] })
      setHandoverModal(false)
      setReplaceUserId('')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-6">
      <div><h1 className="page-title">Shift</h1><p className="page-subtitle">Kelola jam kerja</p></div>

      {/* My Shift Status */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl" style={{ background: activeShift ? 'rgba(34,197,94,0.1)' : 'var(--bg-primary)' }}>
            <Clock size={20} className={activeShift ? 'text-green-500' : ''} style={{ color: activeShift ? undefined : 'var(--text-muted)' }} />
          </div>
          <div>
            <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Status Shift Saya</h3>
            <p className="text-sm" style={{ color: activeShift ? 'var(--success)' : 'var(--text-muted)' }}>
              {activeShift ? 'Shift Aktif' : 'Tidak Ada Shift Aktif'}
            </p>
          </div>
        </div>

        {activeShift ? (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--text-secondary)' }}>Mulai</span>
              <span style={{ color: 'var(--text-primary)' }}>{formatDateTime(activeShift.check_in)}</span>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                variant="warning"
                onClick={() => setHandoverModal(true)}
                icon={<LogOut size={16} />}
                className="w-full"
              >
                PULANG
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Select
              label="Pilih Cabang Shift *"
              value={checkInBranchId}
              onChange={(e) => setCheckInBranchId(e.target.value)}
              options={filteredBranches.map((b) => ({ value: b.id, label: b.name }))}
              placeholder="Pilih cabang"
            />
            <Button
              variant="primary"
              loading={checkInMutation.isPending}
              onClick={() => checkInMutation.mutate()}
              icon={<LogIn size={16} />}
              disabled={!checkInBranchId || !filteredBranches.find(b => b.id === checkInBranchId)?.is_operational}
            >
              MASUK (Mulai Shift)
            </Button>
          </div>
        )}
      </div>

      {/* Other active shifts */}
      {otherActiveUsers.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Staff Aktif</h3>
          <div className="space-y-2">
            {otherActiveUsers.map((s: Shift) => (
              <div key={s.id} className="flex items-center justify-between p-2 rounded-xl" style={{ background: 'var(--bg-primary)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{(s.user as {name: string})?.name}</span>
                </div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Sejak {formatDateTime(s.check_in)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shift History */}
      <div className="card p-5">
        <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Riwayat Shift</h3>
        <div className="space-y-2">
          {history.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>Belum ada riwayat</p>
          ) : (
            history.slice(0, 10).map((s: Shift) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-primary)' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{(s.user as {name: string})?.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDateTime(s.check_in)}</p>
                </div>
                <span className={`badge ${s.status === 'active' ? 'badge-green' : s.status === 'closed' ? 'badge-gray' : 'badge-yellow'}`}>
                  {s.status === 'active' ? 'Aktif' : s.status === 'closed' ? 'Selesai' : 'Menunggu'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Handover Modal — Hanya Pilih Pengganti */}
      <Modal isOpen={handoverModal} onClose={() => setHandoverModal(false)} title="Pilih Pengganti" size="sm"
        footer={<React.Fragment>
          <Button variant="secondary" onClick={() => { setHandoverModal(false); setReplaceUserId('') }}>Batal</Button>
          <Button variant="danger" loading={handoverMutation.isPending} onClick={() => handoverMutation.mutate()}>
            Ya, Pulang
          </Button>
        </React.Fragment>}>
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Pilih staf pengganti untuk menerima tanggung jawab shift Anda.
          </p>

          {otherActiveUsers.length > 0 ? (
            <Select
              label="Staf Pengganti *"
              value={replaceUserId}
              onChange={e => setReplaceUserId(e.target.value)}
              options={otherActiveUsers.map(s => ({ value: s.user_id, label: (s.user as {name:string})?.name ?? s.user_id }))}
              placeholder="Pilih pengganti"
            />
          ) : (
            <div className="p-4 rounded-xl border-2 border-dashed border-red-200 bg-red-50 text-red-600 text-sm">
              <p className="font-bold mb-1">Tidak bisa Pulang</p>
              <p>Staf pengganti harus melakukan <strong>MASUK</strong> terlebih dahulu sebelum Anda bisa Pulang.</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

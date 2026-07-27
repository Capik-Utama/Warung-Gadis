import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, LogIn, LogOut, CheckCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { checkInShift, getActiveShift, requestHandover, approveHandover, getPendingHandover, getAllActiveShifts, fetchShiftHistory } from '@/services/shiftService'
import { fetchUsers } from '@/services/userService'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency, formatDateTime } from '@/utils/format'
import { useAuthStore } from '@/store/authStore'
import type { Shift } from '@/types'

export default function ShiftPage() {
  const { user, selectedBranch } = useAuthStore()
  const qc = useQueryClient()
  const branchId = selectedBranch?.id ?? ''

  const [handoverModal, setHandoverModal] = useState(false)
  const [handoverForm, setHandoverForm] = useState({ to_user_id: '', system_cash: 0, actual_cash: 0, notes: '' })

  const { data: activeShift } = useQuery({
    queryKey: ['active-shift', user?.id],
    queryFn: () => getActiveShift(user!.id),
    enabled: !!user,
    refetchInterval: 30_000,
  })

  const { data: pendingHandover } = useQuery({
    queryKey: ['pending-handover', user?.id],
    queryFn: () => getPendingHandover(user!.id),
    enabled: !!user,
    refetchInterval: 10_000,
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

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: fetchUsers })
  const otherActiveUsers = allActive.filter(s => s.user_id !== user?.id)

  const checkInMutation = useMutation({
    mutationFn: () => {
      if (!user || !branchId) throw new Error('Session tidak valid')
      return checkInShift(user.id, branchId)
    },
    onSuccess: () => { toast.success('Shift dimulai!'); qc.invalidateQueries({ queryKey: ['active-shift'] }); qc.invalidateQueries({ queryKey: ['all-active-shifts'] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  const handoverMutation = useMutation({
    mutationFn: () => {
      if (!activeShift || !user) throw new Error('Tidak ada shift aktif')
      if (!handoverForm.to_user_id) throw new Error('Pilih penerima shift')
      return requestHandover({
        fromShiftId: activeShift.id,
        fromUserId: user.id,
        toUserId: handoverForm.to_user_id,
        branchId,
        systemCash: handoverForm.system_cash,
        actualCash: handoverForm.actual_cash,
        notes: handoverForm.notes,
      })
    },
    onSuccess: () => { toast.success('Permintaan serah terima dikirim'); qc.invalidateQueries({ queryKey: ['active-shift'] }); setHandoverModal(false) },
    onError: (e: Error) => toast.error(e.message),
  })

  const approveMutation = useMutation({
    mutationFn: () => {
      if (!pendingHandover) throw new Error('Tidak ada serah terima pending')
      return approveHandover(pendingHandover.id, pendingHandover.from_shift_id)
    },
    onSuccess: () => { toast.success('Serah terima disetujui'); qc.invalidateQueries({ queryKey: ['pending-handover'] }); qc.invalidateQueries({ queryKey: ['all-active-shifts'] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  const diff = handoverForm.actual_cash - handoverForm.system_cash

  return (
    <div className="space-y-6">
      <div><h1 className="page-title">Shift</h1><p className="page-subtitle">Kelola jam kerja</p></div>

      {/* Pending handover notification */}
      {pendingHandover && (
        <div className="card p-5 border-2 border-amber-400">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={18} className="text-amber-500" />
            <h3 className="font-bold text-amber-600">Permintaan Serah Terima</h3>
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            <strong>{(pendingHandover as {from_user?: {name: string}}).from_user?.name}</strong> meminta serah terima shift kepada Anda.
          </p>
          <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
            <div className="p-3 rounded-xl" style={{ background: 'var(--bg-primary)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Kas Sistem</p>
              <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(pendingHandover.system_cash)}</p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: 'var(--bg-primary)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Kas Aktual</p>
              <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(pendingHandover.actual_cash)}</p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: 'var(--bg-primary)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Selisih</p>
              <p className={`font-bold ${pendingHandover.difference < 0 ? 'text-red-500' : 'text-green-500'}`}>
                {formatCurrency(Math.abs(pendingHandover.difference))}
              </p>
            </div>
          </div>
          {pendingHandover.notes && <p className="text-sm italic mb-4" style={{ color: 'var(--text-muted)' }}>{pendingHandover.notes}</p>}
          <Button variant="success" loading={approveMutation.isPending} onClick={() => approveMutation.mutate()} icon={<CheckCircle size={16} />}>
            Setujui & Ambil Shift
          </Button>
        </div>
      )}

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
                disabled={activeShift.status === 'pending_handover'}
                icon={<LogOut size={16} />}
              >
                {activeShift.status === 'pending_handover' ? 'Menunggu Persetujuan...' : 'Serah Terima Shift'}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="primary"
            loading={checkInMutation.isPending}
            onClick={() => checkInMutation.mutate()}
            icon={<LogIn size={16} />}
          >
            MASUK (Mulai Shift)
          </Button>
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

      {/* Handover Modal */}
      <Modal isOpen={handoverModal} onClose={() => setHandoverModal(false)} title="Serah Terima Shift" size="lg"
        footer={<>
          <Button variant="secondary" onClick={() => setHandoverModal(false)}>Batal</Button>
          <Button variant="primary" loading={handoverMutation.isPending} onClick={() => handoverMutation.mutate()}>Kirim Permintaan</Button>
        </>}>
        <div className="space-y-4">
          <Select
            label="Penerima Shift *"
            value={handoverForm.to_user_id}
            onChange={e => setHandoverForm(f => ({ ...f, to_user_id: e.target.value }))}
            options={allActive.filter(s => s.user_id !== user?.id).map(s => ({ value: s.user_id, label: (s.user as {name:string})?.name ?? s.user_id }))}
            placeholder="Pilih staff yang sudah masuk"
          />
          <Input label="Kas Sistem (Rp)" type="number" value={handoverForm.system_cash} onChange={e => setHandoverForm(f => ({ ...f, system_cash: parseInt(e.target.value) || 0 }))} />
          <Input label="Kas Aktual (Rp)" type="number" value={handoverForm.actual_cash} onChange={e => setHandoverForm(f => ({ ...f, actual_cash: parseInt(e.target.value) || 0 }))} />
          <div className="p-3 rounded-xl flex justify-between" style={{ background: 'var(--bg-primary)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Selisih</span>
            <span className={`font-bold ${diff < 0 ? 'text-red-500' : 'text-green-500'}`}>{diff >= 0 ? '+' : ''}{formatCurrency(diff)}</span>
          </div>
          <Input label="Keterangan" value={handoverForm.notes} onChange={e => setHandoverForm(f => ({ ...f, notes: e.target.value }))} />
        </div>
      </Modal>
    </div>
  )
}

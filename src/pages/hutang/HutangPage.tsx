import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DollarSign, Phone } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchDebts, payDebt } from '@/services/debtService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { statusBadge } from '@/components/ui/Badge'
import { formatCurrency, formatDateTime } from '@/utils/format'
import { useAuthStore } from '@/store/authStore'
import type { Debt } from '@/types'

export default function HutangPage() {
  const { user, selectedBranch } = useAuthStore()
  const qc = useQueryClient()
  const [payModal, setPayModal] = useState(false)
  const [selected, setSelected] = useState<Debt | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payNotes, setPayNotes] = useState('')

  const { data: debts = [], isLoading } = useQuery({ queryKey: ['debts'], queryFn: fetchDebts })

  const payMutation = useMutation({
    mutationFn: () => {
      if (!selected || !user) throw new Error('Invalid session')
      const amount = parseInt(payAmount.replace(/\D/g,''), 10)
      if (!amount) throw new Error('Masukkan jumlah bayar')
      return payDebt(selected.id, amount, user.id, selectedBranch?.id ?? '', payNotes)
    },
    onSuccess: () => { toast.success('Pembayaran dicatat'); qc.invalidateQueries({ queryKey: ['debts'] }); setPayModal(false); setPayAmount(''); setPayNotes('') },
    onError: (e: Error) => toast.error(e.message),
  })

  const openPay = (debt: Debt) => { setSelected(debt); setPayModal(true) }

  return (
    <div className="space-y-5">
      <div><h1 className="page-title">Hutang Pelanggan</h1><p className="page-subtitle">{debts.length} hutang aktif</p></div>
      {isLoading ? <div className="text-center py-10"><span className="loading-spinner" /></div> :
        debts.length === 0 ? <div className="card p-10 text-center" style={{ color: 'var(--text-muted)' }}>Tidak ada hutang aktif 🎉</div> :
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {debts.map(d => (
            <div key={d.id} className="card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{d.customer_name}</p>
                  {d.customer_phone && <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}><Phone size={11} />{d.customer_phone}</div>}
                </div>
                {statusBadge(d.status)}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-secondary)' }}>Total Hutang</span><span className="font-bold text-red-500">{formatCurrency(d.total_amount)}</span></div>
                <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-secondary)' }}>Sudah Dibayar</span><span className="text-green-500">{formatCurrency(d.paid_amount)}</span></div>
                <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-secondary)' }}>Sisa</span><span className="font-bold text-red-500">{formatCurrency(d.remaining_amount)}</span></div>
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDateTime(d.created_at)}</div>
              {d.status !== 'paid' && (
                <Button variant="primary" size="sm" className="w-full" icon={<DollarSign size={14} />} onClick={() => openPay(d)}>Bayar Hutang</Button>
              )}
            </div>
          ))}
        </div>}

      <Modal isOpen={payModal} onClose={() => setPayModal(false)} title="Bayar Hutang"
        footer={<><Button variant="secondary" onClick={() => setPayModal(false)}>Batal</Button><Button variant="success" loading={payMutation.isPending} onClick={() => payMutation.mutate()}>Konfirmasi</Button></>}>
        {selected && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl" style={{ background: 'var(--bg-primary)' }}>
              <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{selected.customer_name}</p>
              <p className="text-sm text-red-500">Sisa Hutang: {formatCurrency(selected.remaining_amount)}</p>
            </div>
            <Input label="Jumlah Bayar *" type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0" />
            <Input label="Keterangan" value={payNotes} onChange={e => setPayNotes(e.target.value)} />
          </div>
        )}
      </Modal>
    </div>
  )
}

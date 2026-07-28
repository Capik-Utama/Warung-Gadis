import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DollarSign, Phone, MapPin, MapPinned, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchDebts, fetchPaidDebts, payDebt, fetchDebtPayments } from '@/services/debtService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { statusBadge } from '@/components/ui/Badge'
import { formatCurrency, formatDateTime } from '@/utils/format'
import { useAuthStore } from '@/store/authStore'
import type { Debt, DebtPayment } from '@/types'

export default function HutangPage() {
  const { user, selectedBranch } = useAuthStore()
  const qc = useQueryClient()
  const [payModal, setPayModal] = useState(false)
  const [selected, setSelected] = useState<Debt | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payNotes, setPayNotes] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [payments, setPayments] = useState<DebtPayment[]>([])
  const [showPayments, setShowPayments] = useState(false)
  const [tab, setTab] = useState<'active' | 'lunas'>('active')

  const { data: debts = [], isLoading } = useQuery({ 
    queryKey: ['debts'], 
    queryFn: fetchDebts 
  })

  const { data: paidDebts = [] } = useQuery({
    queryKey: ['debts-paid'],
    queryFn: fetchPaidDebts,
    enabled: tab === 'lunas',
  })

  const loadPayments = async (debtId: string) => {
    try {
      const list = await fetchDebtPayments(debtId)
      setPayments(list)
      setShowPayments(true)
    } catch {
      toast.error('Gagal memuat riwayat pembayaran')
    }
  }

  const payMutation = useMutation({
    mutationFn: () => {
      if (!selected || !user) throw new Error('Invalid session')
      const amount = parseInt(payAmount.replace(/\D/g, ''), 10)
      if (!amount) throw new Error('Masukkan jumlah bayar')
      if (amount > selected.remaining_amount) throw new Error('Jumlah melebihi sisa hutang')
      // Bayar dari cabang yang sedang dipilih (bisa dari cabang mana saja)
      return payDebt(
        selected.id,
        amount,
        user.id,
        selectedBranch?.id ?? selected.branch_id,
        payNotes,
      )
    },
    onSuccess: () => {
      toast.success('Pembayaran dicatat')
      qc.invalidateQueries({ queryKey: ['debts'] })
      qc.invalidateQueries({ queryKey: ['debts-paid'] })
      setPayModal(false)
      setPayAmount('')
      setPayNotes('')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const openPay = (debt: Debt) => {
    setSelected(debt)
    setPayModal(true)
  }

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
      loadPayments(id)
    }
  }

  const activeDebts = tab === 'active' ? debts : paidDebts
  const totalOutstanding = debts.reduce((s, d) => s + d.remaining_amount, 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Hutang Pelanggan</h1>
          <p className="page-subtitle">
            {debts.length} hutang aktif • Total outstanding: {formatCurrency(totalOutstanding)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('active')}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          style={{
            background: tab === 'active' ? 'var(--accent-primary)' : 'var(--bg-card)',
            color: tab === 'active' ? 'white' : 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
          }}
        >
          Belum Lunas ({debts.length})
        </button>
        <button
          onClick={() => setTab('lunas')}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          style={{
            background: tab === 'lunas' ? 'var(--accent-primary)' : 'var(--bg-card)',
            color: tab === 'lunas' ? 'white' : 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
          }}
        >
          Lunas ({paidDebts.length})
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-10">
          <span className="loading-spinner" />
        </div>
      ) : activeDebts.length === 0 ? (
        <div className="card p-10 text-center" style={{ color: 'var(--text-muted)' }}>
          {tab === 'active' ? 'Tidak ada hutang aktif 🎉' : 'Belum ada hutang yang lunas'}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeDebts.map((d) => (
            <div key={d.id} className="card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                    {d.customer_name}
                  </p>
                  <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    <MapPinned size={10} />
                    <span className="truncate">{d.branch?.name ?? 'Cabang tidak diketahui'}</span>
                  </div>
                  {d.customer_phone && (
                    <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      <Phone size={10} />
                      {d.customer_phone}
                    </div>
                  )}
                  {d.customer_address && (
                    <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      <MapPin size={10} />
                      <span className="truncate">{d.customer_address}</span>
                    </div>
                  )}
                </div>
                {statusBadge(d.status)}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-secondary)' }}>Total Hutang</span>
                  <span className="font-bold text-red-500">{formatCurrency(d.total_amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-secondary)' }}>Sudah Dibayar</span>
                  <span className="text-green-500">{formatCurrency(d.paid_amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-secondary)' }}>Sisa</span>
                  <span className="font-bold text-red-500">{formatCurrency(d.remaining_amount)}</span>
                </div>
                {d.status === 'partial' && (
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div
                      className="bg-green-500 h-1.5 rounded-full"
                      style={{ width: `${Math.round((d.paid_amount / d.total_amount) * 100)}%` }}
                    />
                  </div>
                )}
              </div>

              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {formatDateTime(d.created_at)}
              </div>

              {/* Expand payments history */}
              <button
                onClick={() => toggleExpand(d.id)}
                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 w-full justify-center py-1"
              >
                {expandedId === d.id ? (
                  <>
                    <ChevronUp size={12} /> Sembunyikan riwayat
                  </>
                ) : (
                  <>
                    <ChevronDown size={12} /> Lihat riwayat pembayaran
                  </>
                )}
              </button>

              {expandedId === d.id && showPayments && (
                <div className="space-y-1 p-2 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                  {payments.length === 0 ? (
                    <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>
                      Belum ada pembayaran
                    </p>
                  ) : (
                    payments.map((p) => (
                      <div key={p.id} className="flex justify-between text-xs py-1">
                        <div>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {formatDateTime(p.created_at)} • {p.user?.name ?? 'Unknown'}
                          </span>
                          {p.notes && (
                            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{p.notes}</p>
                          )}
                        </div>
                        <span className="font-bold text-green-500">{formatCurrency(p.amount)}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {d.status !== 'paid' && (
                <Button
                  variant="success"
                  size="sm"
                  className="w-full"
                  icon={<DollarSign size={14} />}
                  onClick={() => openPay(d)}
                >
                  Bayar Hutang
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pay Modal */}
      <Modal
        isOpen={payModal}
        onClose={() => setPayModal(false)}
        title="Bayar Hutang"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPayModal(false)}>Batal</Button>
            <Button
              variant="success"
              loading={payMutation.isPending}
              onClick={() => payMutation.mutate()}
              disabled={payAmount === ''}
            >
              Konfirmasi Bayar
            </Button>
          </>
        }
      >
        {selected && (
          <div className="space-y-4">
            {/* Customer Info */}
            <div className="p-3 rounded-xl" style={{ background: 'var(--bg-primary)' }}>
              <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                {selected.customer_name}
              </p>
              {selected.customer_address && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  <MapPin size={10} className="inline mr-1" />
                  {selected.customer_address}
                </p>
              )}
              {selected.customer_phone && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  <Phone size={10} className="inline mr-1" />
                  {selected.customer_phone}
                </p>
              )}
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Cabang asal: {selected.branch?.name ?? '-'}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Cabang bayar: {selectedBranch?.name ?? selected.branch?.name ?? '-'}
              </p>
            </div>

            <div className="flex justify-between p-3 rounded-xl" style={{ background: 'var(--bg-primary)' }}>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Sisa Hutang</span>
              <span className="font-bold text-red-500">{formatCurrency(selected.remaining_amount)}</span>
            </div>

            <Input
              label="Jumlah Bayar *"
              type="number"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder="0"
            />

            {parseInt(payAmount.replace(/\D/g, ''), 10) > 0 && (
              <div className="flex justify-between p-3 rounded-xl text-sm" style={{ background: 'var(--bg-primary)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Sisa Setelah Bayar</span>
                <span className="font-bold">
                  {formatCurrency(
                    Math.max(
                      0,
                      selected.remaining_amount - (parseInt(payAmount.replace(/\D/g, ''), 10) || 0),
                    ),
                  )}
                </span>
              </div>
            )}

            <Input
              label="Keterangan (Opsional)"
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              placeholder="Catatan pembayaran..."
            />

            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Pembayaran ini akan dicatat di cabang yang sedang Anda pilih.
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}

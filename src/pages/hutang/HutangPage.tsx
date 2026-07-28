import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DollarSign, MapPinned, ChevronDown, ChevronUp, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchDebts, fetchPaidDebts, payDebt, fetchDebtPayments } from '@/services/debtService'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { statusBadge } from '@/components/ui/Badge'
import { formatCurrency, formatDateTime } from '@/utils/format'
import { useAuthStore } from '@/store/authStore'
import type { Debt, DebtPayment } from '@/types'

interface GroupedDebt {
  customerName: string
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  debts: Debt[]
}

export default function HutangPage() {
  const { user, selectedBranch } = useAuthStore()
  const qc = useQueryClient()
  const [payModal, setPayModal] = useState(false)
  const [selected, setSelected] = useState<Debt | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payNotes, setPayNotes] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null)
  const [payments, setPayments] = useState<DebtPayment[]>([])
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

  // Group debts by customer name
  const groupedDebts = useMemo(() => {
    const activeList = tab === 'active' ? debts : paidDebts
    const grouped: Record<string, GroupedDebt> = {}

    activeList.forEach((debt) => {
      const name = debt.customer_name
      if (!grouped[name]) {
        grouped[name] = {
          customerName: name,
          totalAmount: 0,
          paidAmount: 0,
          remainingAmount: 0,
          debts: [],
        }
      }
      grouped[name].totalAmount += debt.total_amount
      grouped[name].paidAmount += debt.paid_amount
      grouped[name].remainingAmount += debt.remaining_amount
      grouped[name].debts.push(debt)
    })

    return Object.values(grouped).sort((a, b) => 
      b.remainingAmount - a.remainingAmount
    )
  }, [debts, paidDebts, tab])

  const loadPayments = async (debtId: string) => {
    try {
      const list = await fetchDebtPayments(debtId)
      setPayments(list)
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

  const toggleGroup = (name: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(name)) {
      newExpanded.delete(name)
    } else {
      newExpanded.add(name)
    }
    setExpandedGroups(newExpanded)
  }

  const toggleDebtExpand = (id: string) => {
    if (expandedDebtId === id) {
      setExpandedDebtId(null)
    } else {
      setExpandedDebtId(id)
      loadPayments(id)
    }
  }

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
      ) : groupedDebts.length === 0 ? (
        <div className="card p-10 text-center" style={{ color: 'var(--text-muted)' }}>
          {tab === 'active' ? 'Tidak ada hutang aktif 🎉' : 'Belum ada hutang yang lunas'}
        </div>
      ) : (
        <div className="space-y-3">
          {groupedDebts.map((group) => (
            <div key={group.customerName} className="card overflow-hidden">
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.customerName)}
                className="w-full p-4 flex items-center justify-between hover:bg-opacity-50 transition-colors"
                style={{ background: 'var(--bg-primary)' }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-base text-left" style={{ color: 'var(--text-primary)' }}>
                      {group.customerName}
                    </p>
                    <p className="text-xs text-left" style={{ color: 'var(--text-muted)' }}>
                      {group.debts.length} transaksi hutang
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-2">
                  <div className="text-right">
                    <p className="font-bold text-red-500">{formatCurrency(group.remainingAmount)}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Sisa
                    </p>
                  </div>
                  {expandedGroups.has(group.customerName) ? (
                    <ChevronUp size={18} style={{ color: 'var(--text-secondary)' }} />
                  ) : (
                    <ChevronDown size={18} style={{ color: 'var(--text-secondary)' }} />
                  )}
                </div>
              </button>

              {/* Group Details */}
              {expandedGroups.has(group.customerName) && (
                <div className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                  {/* Summary */}
                  <div className="p-4 space-y-2" style={{ background: 'var(--bg-card)' }}>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: 'var(--text-secondary)' }}>Total Hutang</span>
                      <span className="font-bold text-red-500">{formatCurrency(group.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: 'var(--text-secondary)' }}>Sudah Dibayar</span>
                      <span className="text-green-500">{formatCurrency(group.paidAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: 'var(--text-secondary)' }}>Sisa Hutang</span>
                      <span className="font-bold text-red-500">{formatCurrency(group.remainingAmount)}</span>
                    </div>
                    {group.totalAmount > 0 && (
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${Math.round((group.paidAmount / group.totalAmount) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Individual Debts */}
                  <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                    {group.debts.map((debt) => (
                      <div key={debt.id} className="p-4 space-y-3">
                        {/* Debt Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                Transaksi #{debt.transaction?.code ?? 'N/A'}
                              </p>
                              {statusBadge(debt.status)}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                              <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                                <MapPinned size={12} className="text-blue-500" />
                                <span>{debt.branch?.name ?? 'Cabang tidak diketahui'}</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                                <User size={12} className="text-purple-500" />
                                <span>Staf: {debt.transaction?.user?.name ?? 'Tidak diketahui'}</span>
                              </div>
                            </div>
                            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                              {formatDateTime(debt.created_at)}
                            </p>
                          </div>
                        </div>

                        {/* Debt Amount Details */}
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span style={{ color: 'var(--text-secondary)' }}>Total</span>
                            <span className="font-bold text-red-500">{formatCurrency(debt.total_amount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span style={{ color: 'var(--text-secondary)' }}>Dibayar</span>
                            <span className="text-green-500">{formatCurrency(debt.paid_amount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span style={{ color: 'var(--text-secondary)' }}>Sisa</span>
                            <span className="font-bold text-red-500">{formatCurrency(debt.remaining_amount)}</span>
                          </div>
                          {debt.status === 'partial' && (
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                              <div
                                className="bg-green-500 h-1.5 rounded-full"
                                style={{ width: `${Math.round((debt.paid_amount / debt.total_amount) * 100)}%` }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Expand payments history */}
                        <button
                          onClick={() => toggleDebtExpand(debt.id)}
                          className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 w-full justify-center py-1"
                        >
                          {expandedDebtId === debt.id ? (
                            <>
                              <ChevronUp size={12} /> Sembunyikan riwayat
                            </>
                          ) : (
                            <>
                              <ChevronDown size={12} /> Lihat riwayat pembayaran
                            </>
                          )}
                        </button>

                        {expandedDebtId === debt.id && (
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

                        {debt.status !== 'paid' && (
                          <Button
                            variant="success"
                            size="sm"
                            className="w-full"
                            icon={<DollarSign size={14} />}
                            onClick={() => openPay(debt)}
                          >
                            Bayar Hutang
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
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
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-primary)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Pelanggan</p>
            <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{selected?.customer_name}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs px-2 py-1 rounded-lg bg-blue-100 text-blue-600 font-medium">
                {selected?.branch?.name}
              </span>
              <span className="text-xs px-2 py-1 rounded-lg bg-purple-100 text-purple-600 font-medium">
                Staf: {selected?.transaction?.user?.name}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--border-color)' }}>
              <p className="text-[10px] mb-1 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Sisa Hutang</p>
              <p className="font-bold text-red-500">{formatCurrency(selected?.remaining_amount ?? 0)}</p>
            </div>
            <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--border-color)' }}>
              <p className="text-[10px] mb-1 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total Awal</p>
              <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(selected?.total_amount ?? 0)}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Jumlah Bayar</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400">Rp</span>
                <input
                  type="text"
                  value={payAmount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '')
                    setPayAmount(val ? parseInt(val).toLocaleString('id-ID') : '')
                  }}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border font-bold text-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Catatan (Opsional)</label>
              <textarea
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none h-20"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                placeholder="Tambahkan keterangan pembayaran..."
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setPayModal(false)}>Batal</Button>
            <Button 
              variant="primary" 
              className="flex-1" 
              onClick={() => payMutation.mutate()}
              isLoading={payMutation.isPending}
            >
              Simpan Pembayaran
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

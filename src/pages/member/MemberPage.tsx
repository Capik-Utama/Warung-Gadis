import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DollarSign, ChevronRight, Search, Users, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  fetchDebts,
  fetchPaidDebts,
  fetchDebtPayments,
  payMemberAmount,
} from '@/services/debtService'
import { getActiveShift } from '@/services/shiftService'
import { STAFF_SHIFT_REQUIRED_MESSAGE } from '@/services/accessGuardService'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { statusBadge } from '@/components/ui/badgeHelpers'
import { formatCurrency, formatDateTime, parseRupiahInput } from '@/utils/format'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'
import type { Debt, DebtPayment } from '@/types'

interface MemberGroup {
  customerName: string
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  lastDate: string
  debts: Debt[]
}

function groupByName(list: Debt[]): MemberGroup[] {
  const grouped: Record<string, MemberGroup> = {}

  list.forEach((debt) => {
    const name = debt.customer_name
    if (!grouped[name]) {
      grouped[name] = {
        customerName: name,
        totalAmount: 0,
        paidAmount: 0,
        remainingAmount: 0,
        lastDate: debt.created_at,
        debts: [],
      }
    }
    const g = grouped[name]
    g.totalAmount += debt.total_amount
    g.paidAmount += debt.paid_amount
    g.remainingAmount += debt.remaining_amount
    if (new Date(debt.created_at) > new Date(g.lastDate)) g.lastDate = debt.created_at
    g.debts.push(debt)
  })

  return Object.values(grouped)
    .map((g) => ({
      ...g,
      debts: [...g.debts].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      ),
    }))
    .sort((a, b) => b.remainingAmount - a.remainingAmount)
}

export default function MemberPage() {
  const navigate = useNavigate()
  const { user, selectedBranch, hasPermission } = useAuthStore()
  const canAccessMember = hasPermission('access_hutang')
  const qc = useQueryClient()

  const branchId = selectedBranch?.id ?? ''
  const { data: activeShift } = useQuery({
    queryKey: ['active-shift', user?.id],
    queryFn: () => getActiveShift(user!.id),
    enabled: !!user,
    refetchInterval: 30_000,
  })
  const isReadOnly = !activeShift || !branchId

  const goToShiftPage = () => {
    toast(STAFF_SHIFT_REQUIRED_MESSAGE)
    navigate('/shift')
  }

  const [tab, setTab] = useState<'active' | 'lunas'>('active')
  const [search, setSearch] = useState('')
  const [openName, setOpenName] = useState<string | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payNotes, setPayNotes] = useState('')
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null)
  const [payments, setPayments] = useState<DebtPayment[]>([])

  const { data: debts = [], isLoading } = useQuery({
    queryKey: ['debts'],
    queryFn: fetchDebts,
  })

  const { data: paidDebts = [] } = useQuery({
    queryKey: ['debts-paid'],
    queryFn: fetchPaidDebts,
    enabled: tab === 'lunas',
  })

  const groups = useMemo(() => {
    const list = tab === 'active' ? debts : paidDebts
    const filtered = search.trim()
      ? list.filter((d) =>
          d.customer_name.toLowerCase().includes(search.trim().toLowerCase()),
        )
      : list
    return groupByName(filtered)
  }, [debts, paidDebts, tab, search])

  const activeGroups = useMemo(() => groupByName(debts), [debts])
  const totalOutstanding = debts.reduce((s, d) => s + d.remaining_amount, 0)

  const selectedGroup = useMemo(
    () => groups.find((g) => g.customerName === openName) ?? null,
    [groups, openName],
  )

  const closeDetail = () => {
    setOpenName(null)
    setPayAmount('')
    setPayNotes('')
    setExpandedDebtId(null)
    setPayments([])
  }

  const toggleDebtExpand = async (id: string) => {
    if (expandedDebtId === id) {
      setExpandedDebtId(null)
      return
    }
    setExpandedDebtId(id)
    try {
      setPayments(await fetchDebtPayments(id))
    } catch {
      toast.error('Gagal memuat riwayat pembayaran')
    }
  }

  const payMutation = useMutation({
    mutationFn: () => {
      if (!selectedGroup || !user) throw new Error('Sesi tidak valid')
      const amount = parseRupiahInput(payAmount)
      if (!amount) throw new Error('Masukkan nominal pembayaran')
      if (amount > selectedGroup.remainingAmount) {
        throw new Error('Nominal melebihi sisa member')
      }
      return payMemberAmount({
        customerName: selectedGroup.customerName,
        amount,
        userId: user.id,
        branchId: selectedBranch?.id ?? selectedGroup.debts[0]?.branch_id ?? '',
        notes: payNotes,
      })
    },
    onSuccess: (result) => {
      toast.success(
        `Pembayaran ${formatCurrency(result.paidAmount)} dicatat` +
          (result.settledCount > 0 ? ` • ${result.settledCount} transaksi lunas` : ''),
      )
      qc.invalidateQueries({ queryKey: ['debts'] })
      qc.invalidateQueries({ queryKey: ['debts-paid'] })
      setPayAmount('')
      setPayNotes('')
      setExpandedDebtId(null)
      setPayments([])
      if (result.remaining <= 0) setOpenName(null)

      // Developer & Manager harus pilih cabang lagi setelah transaksi
      const { user: currentUser, setSelectedBranch } = useAuthStore.getState()
      if (currentUser?.role === 'developer' || currentUser?.role === 'manager') {
        setSelectedBranch(null)
      }
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (!canAccessMember) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <DollarSign size={32} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Akses Ditolak
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Anda tidak memiliki hak akses untuk mengelola Member.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Member</h1>
        <p className="page-subtitle">Ketuk nama member untuk melihat rincian & bayar</p>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wallet size={14} className="text-red-500" />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Total Sisa
            </p>
          </div>
          <p className="text-lg font-bold text-red-500">{formatCurrency(totalOutstanding)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users size={14} className="text-blue-500" />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Member Aktif
            </p>
          </div>
          <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {activeGroups.length}
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
          Belum Lunas
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
          Lunas
        </button>
      </div>

      {/* Pencarian */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--text-muted)' }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama member..."
          className="w-full pl-9 pr-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* Daftar member per nama */}
      {isLoading ? (
        <div className="text-center py-10">
          <span className="loading-spinner" />
        </div>
      ) : groups.length === 0 ? (
        <div className="card p-10 text-center" style={{ color: 'var(--text-muted)' }}>
          {tab === 'active' ? 'Tidak ada member dengan sisa 🎉' : 'Belum ada member yang lunas'}
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <button
              key={group.customerName}
              onClick={() => {
                setOpenName(group.customerName)
                setPayAmount('')
                setPayNotes('')
              }}
              className="card w-full p-4 flex items-center justify-between text-left transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base truncate" style={{ color: 'var(--text-primary)' }}>
                  {group.customerName}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {group.debts.length} transaksi • terakhir {formatDateTime(group.lastDate)}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-3">
                <div className="text-right">
                  <p className="font-bold text-red-500">{formatCurrency(group.remainingAmount)}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    Sisa
                  </p>
                </div>
                <ChevronRight size={18} style={{ color: 'var(--text-secondary)' }} />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Rincian member */}
      <Modal
        isOpen={!!selectedGroup}
        onClose={closeDetail}
        title={selectedGroup?.customerName ?? 'Member'}
        size="lg"
      >
        {selectedGroup && (
          <div className="space-y-4">
            {/* Ringkasan member */}
            <div className="p-4 rounded-xl space-y-2" style={{ background: 'var(--bg-primary)' }}>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--text-secondary)' }}>Total</span>
                <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                  {formatCurrency(selectedGroup.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--text-secondary)' }}>Sudah Dibayar</span>
                <span className="text-green-500">{formatCurrency(selectedGroup.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-base pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Sisa</span>
                <span className="font-bold text-red-500">
                  {formatCurrency(selectedGroup.remainingAmount)}
                </span>
              </div>
            </div>

            {/* Rincian transaksi */}
            <div className="space-y-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Rincian ({selectedGroup.debts.length} transaksi)
              </p>
              <div className="divide-y rounded-xl border" style={{ borderColor: 'var(--border-color)' }}>
                {selectedGroup.debts.map((debt) => (
                  <div key={debt.id} className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            #{debt.transaction?.code ?? 'N/A'}
                          </p>
                          {statusBadge(debt.status)}
                        </div>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                          {formatDateTime(debt.created_at)} • {debt.branch?.name ?? 'Cabang -'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-red-500">
                          {formatCurrency(debt.remaining_amount)}
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          dari {formatCurrency(debt.total_amount)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleDebtExpand(debt.id)}
                      className="text-xs text-blue-500 hover:text-blue-600"
                    >
                      {expandedDebtId === debt.id ? 'Sembunyikan riwayat' : 'Riwayat pembayaran'}
                    </button>

                    {expandedDebtId === debt.id && (
                      <div className="space-y-1 p-2 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                        {payments.length === 0 ? (
                          <p className="text-xs text-center py-1" style={{ color: 'var(--text-muted)' }}>
                            Belum ada pembayaran
                          </p>
                        ) : (
                          payments.map((p) => (
                            <div key={p.id} className="flex justify-between text-xs py-1">
                              <div>
                                <span style={{ color: 'var(--text-secondary)' }}>
                                  {formatDateTime(p.created_at)} • {p.user?.name ?? '-'}
                                </span>
                                {p.notes && (
                                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                    {p.notes}
                                  </p>
                                )}
                              </div>
                              <span className="font-bold text-green-500">
                                {formatCurrency(p.amount)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Bayar: ketik nominal */}
            {selectedGroup.remainingAmount > 0 && (
              <div className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Nominal Bayar
                  </label>
                  <button
                    onClick={() =>
                      setPayAmount(selectedGroup.remainingAmount.toLocaleString('id-ID'))
                    }
                    className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                  >
                    Lunasi semua
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={payAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '')
                      setPayAmount(val ? parseInt(val, 10).toLocaleString('id-ID') : '')
                    }}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border font-bold text-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    style={{
                      background: 'var(--bg-card)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                    placeholder="0"
                  />
                </div>
                <textarea
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Catatan (opsional)"
                  className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none h-16"
                  style={{
                    background: 'var(--bg-card)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                />
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  Pembayaran otomatis melunasi transaksi paling lama lebih dulu.
                </p>
                <Button
                  variant="success"
                  className="w-full"
                  icon={<DollarSign size={16} />}
                  loading={payMutation.isPending}
                  disabled={isReadOnly}
                  onClick={isReadOnly ? goToShiftPage : () => payMutation.mutate()}
                >
                  Bayar
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

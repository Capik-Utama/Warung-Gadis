import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, Eye, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchTransactions, deleteTransaction } from '@/services/transactionService'
import { getActiveShift } from '@/services/shiftService'
import { STAFF_SHIFT_REQUIRED_MESSAGE } from '@/services/accessGuardService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { statusBadge } from '@/components/ui/badgeHelpers'
import { formatCurrency, formatDateTime } from '@/utils/format'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'
import type { Transaction } from '@/types'

export default function TransaksiPage() {
  const navigate = useNavigate()
  const { user, selectedBranch, hasPermission } = useAuthStore()
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
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState<Transaction | null>(null)
  const [del, setDel] = useState<Transaction | null>(null)

  const { data: transactions = [], isLoading } = useQuery({ queryKey: ['transactions', branchId], queryFn: () => fetchTransactions(branchId), enabled: !!branchId })
  const filtered = transactions.filter(t => t.code.toLowerCase().includes(search.toLowerCase()) || (t.customer_name ?? '').toLowerCase().includes(search.toLowerCase()))

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => { toast.success('Transaksi dihapus'); qc.invalidateQueries({ queryKey: ['transactions'] }); setDel(null) },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-5">
      <div><h1 className="page-title">Transaksi</h1><p className="page-subtitle">{transactions.length} transaksi</p></div>
      <Input placeholder="Cari kode/pelanggan..." value={search} onChange={e => setSearch(e.target.value)} leftIcon={<Search size={16} />} />
      <div className="table-container">
        <table className="table">
          <thead><tr><th>Kode</th><th>Pelanggan</th><th>Total</th><th>Pembayaran</th><th>Status</th><th>Kasir</th><th>Waktu</th><th>Aksi</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={8} className="text-center py-10"><span className="loading-spinner" /></td></tr> :
              filtered.length === 0 ? <tr><td colSpan={8} className="text-center py-10" style={{ color: 'var(--text-muted)' }}>Tidak ada transaksi</td></tr> :
              filtered.map(t => (
                <tr key={t.id}>
                  <td className="font-mono font-semibold" style={{ color: 'var(--accent-primary)' }}>{t.code}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{t.customer_name ?? '-'}</td>
                  <td className="font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(t.total_amount)}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{t.payment_method ?? '-'}</td>
                  <td>{statusBadge(t.status)}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{(t.user as {name:string})?.name ?? '-'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{formatDateTime(t.created_at)}</td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => setDetail(t)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Eye size={15} /></button>
                      {hasPermission('delete_transaction') && (
                        <button 
                          onClick={isReadOnly ? goToShiftPage : () => setDel(t)} 
                          className={`p-1.5 rounded-lg transition-colors ${isReadOnly ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:bg-red-50 text-red-500'}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title="Detail Transaksi" size="lg">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="label">Kode</p><p className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{detail.code}</p></div>
              <div><p className="label">Status</p>{statusBadge(detail.status)}</div>
              <div><p className="label">Pelanggan</p><p style={{ color: 'var(--text-primary)' }}>{detail.customer_name ?? '-'}</p></div>
              <div><p className="label">Metode Bayar</p><p style={{ color: 'var(--text-primary)' }}>{detail.payment_method ?? '-'}</p></div>
              <div><p className="label">Total</p><p className="font-bold text-lg" style={{ color: 'var(--accent-primary)' }}>{formatCurrency(detail.total_amount)}</p></div>
              <div><p className="label">Dibayar</p><p style={{ color: 'var(--text-primary)' }}>{formatCurrency(detail.paid_amount)}</p></div>
            </div>
            {detail.items && (
              <div>
                <p className="label mb-2">Item</p>
                <div className="space-y-1">
                  {detail.items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm py-1" style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <span style={{ color: 'var(--text-primary)' }}>{(item.product as {name:string})?.name} × {item.quantity}</span>
                      <span style={{ color: 'var(--accent-primary)' }}>{formatCurrency(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!del} onClose={() => setDel(null)} title="Hapus Transaksi"
        footer={<><Button variant="secondary" onClick={() => setDel(null)}>Batal</Button><Button variant="danger" loading={deleteMutation.isPending} onClick={() => del && deleteMutation.mutate(del.id)}>Hapus</Button></>}>
        <p style={{ color: 'var(--text-secondary)' }}>Yakin hapus transaksi <strong>{del?.code}</strong>?</p>
      </Modal>
    </div>
  )
}

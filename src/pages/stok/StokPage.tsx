import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, History, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { fetchStockLogs, addStock } from '@/services/stockService'
import { fetchProducts } from '@/services/productService'
import { fetchSuppliers } from '@/services/supplierService'
import { getActiveShift } from '@/services/shiftService'
import { STAFF_SHIFT_REQUIRED_MESSAGE } from '@/services/accessGuardService'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { formatDateTime } from '@/utils/format'
import { useAuthStore } from '@/store/authStore'

export default function StokPage() {
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
  const canAddStock = hasPermission('add_stock')
  const isReadOnly = !activeShift || !branchId || !canAddStock

  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ product_id: '', type: 'in' as 'in'|'out'|'adjustment', quantity: 1, notes: '', supplier_id: '' })

  const { data: logs = [], isLoading } = useQuery({ queryKey: ['stock-logs', branchId], queryFn: () => fetchStockLogs(branchId), enabled: !!branchId })
  const { data: products = [] } = useQuery({ queryKey: ['products', branchId], queryFn: () => fetchProducts(branchId) })
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: fetchSuppliers })

  const lowStock = products.filter(p => p.stock <= p.min_stock)

  const addMutation = useMutation({
    mutationFn: () => {
      if (!form.product_id) throw new Error('Pilih produk')
      if (!user || !branchId) throw new Error('Session tidak valid')
      return addStock({ ...form, user_id: user.id, branch_id: branchId, supplier_id: form.supplier_id || undefined })
    },
    onSuccess: () => { toast.success('Stok diperbarui'); qc.invalidateQueries({ queryKey: ['stock-logs'] }); qc.invalidateQueries({ queryKey: ['products'] }); setModal(false) },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Manajemen Stok</h1><p className="page-subtitle">Riwayat pergerakan stok</p></div>
        <Button
          variant="primary"
          icon={<Plus size={16} />}
          onClick={isReadOnly ? () => {
            toast(STAFF_SHIFT_REQUIRED_MESSAGE)
            navigate('/shift')
          } : () => setModal(true)}
          disabled={isReadOnly}
        >
          Tambah Stok
        </Button>
      </div>

      {isReadOnly && (
        <div className="card p-4 border-l-4 border-amber-400">
          <p className="font-semibold text-amber-700">Belum Masuk Shift / Read Only</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Aksi ubah stok dikunci sampai Anda masuk shift.
          </p>
        </div>
      )}

      {lowStock.length > 0 && (
        <div className="card p-4 border-l-4 border-red-500">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle size={16} className="text-red-500" /><span className="font-semibold text-red-500">Stok Menipis ({lowStock.length})</span></div>
          <div className="flex flex-wrap gap-2">
            {lowStock.map(p => <span key={p.id} className="badge badge-red">{p.name}: {p.stock} {p.unit}</span>)}
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="table">
          <thead><tr><th>Produk</th><th>Jenis</th><th>Qty</th><th>Petugas</th><th>Keterangan</th><th>Waktu</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={6} className="text-center py-10"><span className="loading-spinner" /></td></tr> :
              logs.length === 0 ? <tr><td colSpan={6} className="text-center py-10" style={{ color: 'var(--text-muted)' }}>Belum ada riwayat stok</td></tr> :
              logs.map(log => (
                <tr key={log.id}>
                  <td style={{ color: 'var(--text-primary)' }}>{(log.product as {name:string})?.name ?? '-'}</td>
                  <td><span className={`badge ${log.type === 'in' ? 'badge-green' : log.type === 'out' ? 'badge-red' : 'badge-yellow'}`}>{log.type === 'in' ? 'Masuk' : log.type === 'out' ? 'Keluar' : 'Penyesuaian'}</span></td>
                  <td className="font-semibold" style={{ color: 'var(--text-primary)' }}>{log.quantity}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{(log.user as {name:string})?.name ?? '-'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{log.notes ?? '-'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{formatDateTime(log.created_at)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Tambah Stok"
        footer={<><Button variant="secondary" onClick={() => setModal(false)}>Batal</Button><Button variant="primary" loading={addMutation.isPending} onClick={() => addMutation.mutate()}>Simpan</Button></>}>
        <div className="space-y-4">
          <Select label="Produk *" value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))} options={products.map(p => ({ value: p.id, label: `${p.name} (Stok: ${p.stock})` }))} placeholder="Pilih produk" />
          <Select label="Jenis" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as 'in'|'out'|'adjustment' }))} options={[{ value: 'in', label: 'Stok Masuk' }, { value: 'out', label: 'Stok Keluar' }, { value: 'adjustment', label: 'Penyesuaian' }]} />
          <Input label="Jumlah *" type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 0 }))} />
          <Select label="Supplier" value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))} options={suppliers.map(s => ({ value: s.id, label: s.name }))} placeholder="Pilih supplier (opsional)" />
          <Input label="Keterangan" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>
      </Modal>
    </div>
  )
}

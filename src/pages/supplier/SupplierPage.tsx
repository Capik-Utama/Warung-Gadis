import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Search, Truck, Phone } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchSuppliers, createSupplier, updateSupplier, deleteSupplier } from '@/services/supplierService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import type { Supplier } from '@/types'

const def = { name: '', address: '', phone: '', notes: '', is_active: true }

export default function SupplierPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState<typeof def>(def)
  const [del, setDel] = useState<Supplier | null>(null)

  const { data: suppliers = [], isLoading } = useQuery({ queryKey: ['suppliers'], queryFn: fetchSuppliers })
  const filtered = suppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))

  const saveMutation = useMutation({
    mutationFn: () => editing ? updateSupplier(editing.id, form) : createSupplier(form),
    onSuccess: () => { toast.success('Supplier disimpan'); qc.invalidateQueries({ queryKey: ['suppliers'] }); setModal(false) },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSupplier(id),
    onSuccess: () => { toast.success('Supplier dihapus'); qc.invalidateQueries({ queryKey: ['suppliers'] }); setDel(null) },
    onError: (e: Error) => toast.error(e.message),
  })

  const openAdd = () => { setEditing(null); setForm(def); setModal(true) }
  const openEdit = (s: Supplier) => { setEditing(s); setForm({ name: s.name, address: s.address, phone: s.phone, notes: s.notes ?? '', is_active: s.is_active }); setModal(true) }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Supplier</h1><p className="page-subtitle">{suppliers.length} supplier</p></div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={openAdd}>Tambah</Button>
      </div>
      <Input placeholder="Cari supplier..." value={search} onChange={e => setSearch(e.target.value)} leftIcon={<Search size={16} />} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? <div className="col-span-full text-center py-10"><span className="loading-spinner" /></div> :
          filtered.map(s => (
            <div key={s.id} className="card p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-50"><Truck size={18} className="text-blue-500" /></div>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Pencil size={14} /></button>
                  <button onClick={() => setDel(s)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{s.address}</p>
              {s.phone && <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-muted)' }}><Phone size={12} />{s.phone}</div>}
              {s.notes && <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>{s.notes}</p>}
            </div>
          ))}
        {filtered.length === 0 && !isLoading && <div className="col-span-full text-center py-10" style={{ color: 'var(--text-muted)' }}>Tidak ada supplier</div>}
      </div>
      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Supplier' : 'Tambah Supplier'}
        footer={<><Button variant="secondary" onClick={() => setModal(false)}>Batal</Button><Button variant="primary" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>Simpan</Button></>}>
        <div className="space-y-4">
          <Input label="Nama *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Alamat" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          <Input label="Nomor HP" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <Input label="Catatan" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>
      </Modal>
      <Modal isOpen={!!del} onClose={() => setDel(null)} title="Hapus Supplier"
        footer={<><Button variant="secondary" onClick={() => setDel(null)}>Batal</Button><Button variant="danger" loading={deleteMutation.isPending} onClick={() => del && deleteMutation.mutate(del.id)}>Hapus</Button></>}>
        <p style={{ color: 'var(--text-secondary)' }}>Yakin hapus supplier <strong>{del?.name}</strong>?</p>
      </Modal>
    </div>
  )
}

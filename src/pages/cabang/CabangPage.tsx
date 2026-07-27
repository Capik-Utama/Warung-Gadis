import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, GitBranch, Phone } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchBranches, createBranch, updateBranch, deleteBranch } from '@/services/branchService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { statusBadge } from '@/components/ui/Badge'
import type { Branch } from '@/types'

const def = { name: '', address: '', phone: '', is_active: true }

export default function CabangPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Branch | null>(null)
  const [form, setForm] = useState<typeof def>(def)
  const [del, setDel] = useState<Branch | null>(null)

  const { data: branches = [], isLoading } = useQuery({ queryKey: ['branches'], queryFn: fetchBranches })

  const saveMutation = useMutation({
    mutationFn: () => editing ? updateBranch(editing.id, form) : createBranch(form),
    onSuccess: () => { toast.success('Cabang disimpan'); qc.invalidateQueries({ queryKey: ['branches'] }); setModal(false) },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBranch(id),
    onSuccess: () => { toast.success('Cabang dihapus'); qc.invalidateQueries({ queryKey: ['branches'] }); setDel(null) },
    onError: (e: Error) => toast.error(e.message),
  })

  const openAdd = () => { setEditing(null); setForm(def); setModal(true) }
  const openEdit = (b: Branch) => { setEditing(b); setForm({ name: b.name, address: b.address, phone: b.phone, is_active: b.is_active }); setModal(true) }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Cabang</h1><p className="page-subtitle">{branches.length} cabang terdaftar</p></div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={openAdd}>Tambah Cabang</Button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? <div className="col-span-full text-center py-10"><span className="loading-spinner" /></div> :
          branches.map(b => (
            <div key={b.id} className="card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-50"><GitBranch size={18} className="text-blue-500" /></div>
                  <div>
                    <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{b.name}</p>
                    {statusBadge(b.is_active ? 'active' : 'inactive')}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Pencil size={14} /></button>
                  <button onClick={() => setDel(b)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{b.address}</p>
              {b.phone && <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-muted)' }}><Phone size={12} />{b.phone}</div>}
            </div>
          ))}
      </div>
      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Cabang' : 'Tambah Cabang'}
        footer={<><Button variant="secondary" onClick={() => setModal(false)}>Batal</Button><Button variant="primary" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>Simpan</Button></>}>
        <div className="space-y-4">
          <Input label="Nama Cabang *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Alamat" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          <Input label="Nomor HP" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <div className="flex items-center gap-2"><input type="checkbox" id="active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4" /><label htmlFor="active" className="text-sm" style={{ color: 'var(--text-secondary)' }}>Cabang aktif</label></div>
        </div>
      </Modal>
      <Modal isOpen={!!del} onClose={() => setDel(null)} title="Hapus Cabang"
        footer={<><Button variant="secondary" onClick={() => setDel(null)}>Batal</Button><Button variant="danger" loading={deleteMutation.isPending} onClick={() => del && deleteMutation.mutate(del.id)}>Hapus</Button></>}>
        <p style={{ color: 'var(--text-secondary)' }}>Yakin hapus cabang <strong>{del?.name}</strong>?</p>
      </Modal>
    </div>
  )
}

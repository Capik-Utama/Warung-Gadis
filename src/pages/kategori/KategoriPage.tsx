import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchCategories, createCategory, updateCategory, deleteCategory } from '@/services/categoryService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import type { Category } from '@/types'

const defaultForm = { name: '', icon: '', sort_order: 0, branch_id: null }

export default function KategoriPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState<typeof defaultForm>(defaultForm)
  const [deleteConfirm, setDeleteConfirm] = useState<Category | null>(null)

  const { data: categories = [], isLoading } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories })

  const saveMutation = useMutation({
    mutationFn: () => editing ? updateCategory(editing.id, form) : createCategory(form),
    onSuccess: () => { toast.success('Kategori disimpan'); qc.invalidateQueries({ queryKey: ['categories'] }); setModal(false) },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => { toast.success('Kategori dihapus'); qc.invalidateQueries({ queryKey: ['categories'] }); setDeleteConfirm(null) },
    onError: (e: Error) => toast.error(e.message),
  })

  const openAdd = () => { setEditing(null); setForm(defaultForm); setModal(true) }
  const openEdit = (cat: Category) => { setEditing(cat); setForm({ name: cat.name, icon: cat.icon ?? '', sort_order: cat.sort_order, branch_id: null }); setModal(true) }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Kategori</h1><p className="page-subtitle">{categories.length} kategori</p></div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={openAdd}>Tambah</Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {isLoading ? <div className="col-span-full text-center py-10"><span className="loading-spinner" /></div> :
          categories.map((cat) => (
            <div key={cat.id} className="card flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{cat.icon ?? '📦'}</span>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{cat.name}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Pencil size={14} /></button>
                <button onClick={() => setDeleteConfirm(cat)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
      </div>
      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Kategori' : 'Tambah Kategori'}
        footer={<><Button variant="secondary" onClick={() => setModal(false)}>Batal</Button><Button variant="primary" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>Simpan</Button></>}>
        <div className="space-y-4">
          <Input label="Nama Kategori *" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Icon (emoji)" value={form.icon} onChange={(e) => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="☕" />
          <Input label="Urutan" type="number" value={form.sort_order} onChange={(e) => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
        </div>
      </Modal>
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Hapus Kategori"
        footer={<><Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Batal</Button><Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}>Hapus</Button></>}>
        <p style={{ color: 'var(--text-secondary)' }}>Yakin hapus kategori <strong>{deleteConfirm?.name}</strong>?</p>
      </Modal>
    </div>
  )
}

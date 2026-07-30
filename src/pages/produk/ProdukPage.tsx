import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Search, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchProducts, createProduct, updateProduct, deleteProduct } from '@/services/productService'
import { fetchCategories } from '@/services/categoryService'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { statusBadge } from '@/components/ui/Badge'
import { formatCurrency } from '@/utils/format'
import { useAuthStore } from '@/store/authStore'
import type { Product } from '@/types'

const UNITS = ['pcs', 'kg', 'gram', 'liter', 'ml', 'pack', 'box', 'dus', 'botol', 'bungkus']

const defaultForm: Partial<Product> = {
  name: '',
  category_id: '',
  base_price: 0,
  stock: 0,
  min_stock: 2,
  unit: 'pcs',
  is_active: true,
}

export default function ProdukPage() {
  const { selectedBranch, hasPermission } = useAuthStore()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<Partial<Product>>(defaultForm)
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null)

  const branchId = selectedBranch?.id ?? ''
  const canAdd = hasPermission('add_product')
  const canEdit = hasPermission('edit_product')
  const canDelete = hasPermission('delete_product')

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', branchId],
    queryFn: () => fetchProducts(branchId),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  )

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name?.trim()) throw new Error('Nama produk wajib diisi')
      if (!form.category_id) throw new Error('Kategori wajib dipilih')
      if (editing) {
        return updateProduct(editing.id, form)
      } else {
        return createProduct(form as Parameters<typeof createProduct>[0])
      }
    },
    onSuccess: () => {
      toast.success(editing ? 'Produk diperbarui' : 'Produk ditambahkan')
      qc.invalidateQueries({ queryKey: ['products'] })
      setModal(false)
      setEditing(null)
      setForm(defaultForm)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      toast.success('Produk dihapus')
      qc.invalidateQueries({ queryKey: ['products'] })
      setDeleteConfirm(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const openAdd = () => {
    setEditing(null)
    setForm(defaultForm)
    setModal(true)
  }

  const openEdit = (product: Product) => {
    setEditing(product)
    setForm({
      name: product.name,
      category_id: product.category_id,
      base_price: product.base_price,
      stock: product.stock,
      min_stock: product.min_stock,
      unit: product.unit,
      is_active: product.is_active,
    })
    setModal(true)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Produk</h1>
          <p className="page-subtitle">{products.length} produk terdaftar</p>
        </div>
        {canAdd && (
          <div className="flex gap-2">
            <Button variant="primary" icon={<Plus size={16} />} onClick={openAdd}>
              Tambah
            </Button>
          </div>
        )}
      </div>

      {/* Search */}
      <Input
        placeholder="Cari produk..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leftIcon={<Search size={16} />}
      />

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Produk</th>
              <th>Kategori</th>
              <th>Harga</th>
              <th>Stok</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-10"><span className="loading-spinner" style={{ color: 'var(--accent-primary)' }} /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10" style={{ color: 'var(--text-muted)' }}>Tidak ada produk</td></tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                        <Package size={16} className="text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{p.category?.name ?? '-'}</td>
                  <td className="font-semibold" style={{ color: 'var(--accent-primary)' }}>{formatCurrency(p.base_price)}</td>
                  <td>
                    <span
                      className={`font-semibold ${p.stock <= p.min_stock ? 'text-red-500' : ''}`}
                      style={{ color: p.stock <= p.min_stock ? undefined : 'var(--text-primary)' }}
                    >
                      {p.stock} {p.unit}
                    </span>
                  </td>
                  <td>{statusBadge(p.is_active ? 'active' : 'inactive')}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500">
                          <Pencil size={15} />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => setDeleteConfirm(p)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Edit Produk' : 'Tambah Produk'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)}>Batal</Button>
            <Button variant="primary" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              Simpan
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input
              label="Nama Produk *"
              value={form.name ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Nama produk"
            />
          </div>
          <Select
            label="Kategori *"
            value={form.category_id ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Pilih kategori"
          />
          <Input
            label="Harga Jual (Rp)"
            type="number"
            value={form.base_price ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, base_price: parseInt(e.target.value) || 0 }))}
          />
          <Input
            label="Stok"
            type="number"
            value={form.stock ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, stock: parseInt(e.target.value) || 0 }))}
          />
          <Input
            label="Minimum Stok"
            type="number"
            value={form.min_stock ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, min_stock: parseInt(e.target.value) || 0 }))}
          />
          <Select
            label="Satuan"
            value={form.unit ?? 'pcs'}
            onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
            options={UNITS.map((u) => ({ value: u, label: u }))}
          />
          <div className="col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active ?? true}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="w-4 h-4"
            />
            <label htmlFor="is_active" className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Produk aktif
            </label>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Hapus Produk"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Batal</Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
            >
              Hapus
            </Button>
          </>
        }
      >
        <p style={{ color: 'var(--text-secondary)' }}>
          Yakin ingin menghapus produk <strong style={{ color: 'var(--text-primary)' }}>{deleteConfirm?.name}</strong>?
          Tindakan ini tidak dapat dibatalkan.
        </p>
      </Modal>
    </div>
  )
}

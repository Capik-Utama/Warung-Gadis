import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { fetchProducts, createProduct } from '@/services/productService'
import { fetchCategories } from '@/services/categoryService'
import { fetchBranches } from '@/services/branchService'
import { getActiveShift } from '@/services/shiftService'
import { STAFF_SHIFT_REQUIRED_MESSAGE } from '@/services/accessGuardService'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useAuthStore } from '@/store/authStore'

const UNITS = ['pcs', 'kg', 'gram', 'liter', 'ml', 'pack', 'box', 'dus', 'botol', 'bungkus']

interface ProductForm {
  name: string
  category_id: string
  base_price: number
  stock: number
  min_stock: number
  unit: string
  is_active: boolean
  image_url: string | null
}

export default function StokPage() {
  const navigate = useNavigate()
  const { user, selectedBranch, hasPermission } = useAuthStore()
  const qc = useQueryClient()
  const branchId = selectedBranch?.id ?? ''
  const isManager = user?.role === 'manager'
  
  const { data: activeShift } = useQuery({
    queryKey: ['active-shift', user?.id],
    queryFn: () => getActiveShift(user!.id),
    enabled: !!user,
    refetchInterval: 30_000,
  })
  
  const canAddStock = hasPermission('add_stock')
  const isReadOnly = !activeShift || !branchId || !canAddStock

  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<ProductForm>({
    name: '',
    category_id: '',
    base_price: 0,
    stock: 0,
    min_stock: 5,
    unit: 'pcs',
    is_active: true,
    image_url: null,
  })
  const [selectedBranchId, setSelectedBranchId] = useState(branchId)

  const { data: products = [] } = useQuery({ queryKey: ['products', branchId], queryFn: () => fetchProducts(branchId) })
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories })
  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: fetchBranches })

  const lowStock = products.filter(p => p.stock <= p.min_stock)

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('Nama produk wajib diisi')
      if (!form.category_id) throw new Error('Kategori wajib dipilih')
      if (!selectedBranchId) throw new Error('Cabang wajib dipilih')
      
      return createProduct({
        ...form,
        branch_id: selectedBranchId,
      })
    },
    onSuccess: () => { 
      toast.success('Produk berhasil ditambahkan') 
      qc.invalidateQueries({ queryKey: ['products'] }) 
      setModal(false)
      setForm({
        name: '',
        category_id: '',
        base_price: 0,
        stock: 0,
        min_stock: 5,
        unit: 'pcs',
        is_active: true,
        image_url: null,
      })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const openModal = () => {
    if (isReadOnly) {
      toast(STAFF_SHIFT_REQUIRED_MESSAGE)
      navigate('/shift')
      return
    }
    setSelectedBranchId(branchId)
    setModal(true)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Manajemen Stok</h1><p className="page-subtitle">Kelola produk dan stok</p></div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={openModal}>
          Tambah Produk
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
          <thead><tr><th>Produk</th><th>Kategori</th><th>Harga</th><th>Stok</th><th>Min</th></tr></thead>
          <tbody>
            {products.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10" style={{ color: 'var(--text-muted)' }}>Belum ada produk</td></tr>
            ) : (
              products.map(p => (
                <tr key={p.id}>
                  <td style={{ color: 'var(--text-primary)' }}>{p.name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{p.category?.name ?? '-'}</td>
                  <td className="font-semibold" style={{ color: 'var(--accent-primary)' }}>Rp {(p.base_price).toLocaleString('id-ID')}</td>
                  <td className={p.stock <= p.min_stock ? 'text-red-500 font-semibold' : ''}>{p.stock} {p.unit}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{p.min_stock} {p.unit}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Tambah Produk" size="lg"
        footer={<><Button variant="secondary" onClick={() => setModal(false)}>Batal</Button><Button variant="primary" loading={addMutation.isPending} onClick={() => addMutation.mutate()}>Simpan</Button></>}>
        <div className="grid grid-cols-2 gap-4">
          {isManager && !branchId && (
            <Select 
              label="Cabang *" 
              value={selectedBranchId} 
              onChange={e => setSelectedBranchId(e.target.value)} 
              options={branches.filter(b => b.is_active).map(b => ({ value: b.id, label: b.name }))} 
              placeholder="Pilih cabang" 
            />
          )}
          <div className={isManager && !branchId ? '' : 'col-span-2'}>
            <Input 
              label="Nama Produk *" 
              value={form.name} 
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
              placeholder="Nama produk"
            />
          </div>
          <Select 
            label="Kategori *" 
            value={form.category_id} 
            onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} 
            options={categories.map(c => ({ value: c.id, label: c.name }))} 
            placeholder="Pilih kategori" 
          />
          <Input 
            label="Harga Jual (Rp)" 
            type="number" 
            value={form.base_price || ''} 
            onChange={e => setForm(f => ({ ...f, base_price: parseInt(e.target.value) || 0 }))} 
          />
          <Input 
            label="Stok" 
            type="number" 
            value={form.stock || ''} 
            onChange={e => setForm(f => ({ ...f, stock: parseInt(e.target.value) || 0 }))} 
          />
          <Input 
            label="Minimum Stok" 
            type="number" 
            value={form.min_stock || ''} 
            onChange={e => setForm(f => ({ ...f, min_stock: parseInt(e.target.value) || 0 }))} 
          />
          <Select 
            label="Satuan" 
            value={form.unit} 
            onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} 
            options={UNITS.map(u => ({ value: u, label: u }))} 
          />
        </div>
      </Modal>
    </div>
  )
}

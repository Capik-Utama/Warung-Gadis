import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Search, Package, Boxes } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  fetchProductsAllBranches,
  createProduct,
  updateProduct,
  deleteProduct,
} from '@/services/productService'
import { fetchCategories } from '@/services/categoryService'
import { fetchBranches } from '@/services/branchService'
import { setBranchStock } from '@/services/stockService'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { statusBadge } from '@/components/ui/Badge'
import { formatCurrency } from '@/utils/format'
import { useAuthStore } from '@/store/authStore'
import type { Product, ProductWithBranchStocks } from '@/types'

const UNITS = ['pcs', 'kg', 'gram', 'liter', 'ml', 'pack', 'box', 'dus', 'botol', 'bungkus']

const TOTAL_KEY = '__total__'

const defaultForm: Partial<Product> = {
  name: '',
  category_id: '',
  base_price: 0,
  min_stock: 2,
  unit: 'pcs',
  is_active: true,
}

export default function ProdukPage() {
  const { user, hasPermission } = useAuthStore()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<Partial<Product>>(defaultForm)
  const [branchStocks, setBranchStocks] = useState<Record<string, number>>({})
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null)
  const [stockEdit, setStockEdit] = useState<{
    product: ProductWithBranchStocks
    branchId: string
    branchName: string
    value: number
  } | null>(null)

  const canAdd = hasPermission('add_product')
  const canEdit = hasPermission('edit_product')
  const canDelete = hasPermission('delete_product')
  const canStock = hasPermission('add_stock')

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products-all-branches'],
    queryFn: fetchProductsAllBranches,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: fetchBranches,
  })

  const activeBranches = useMemo(() => branches.filter((b) => b.is_active), [branches])

  const slides = useMemo(
    () => [
      { key: TOTAL_KEY, label: 'Total' },
      ...activeBranches.map((b) => ({ key: b.id, label: b.name })),
    ],
    [activeBranches],
  )

  const [activeSlide, setActiveSlide] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const tabsRef = useRef<HTMLDivElement>(null)

  // Sinkronkan tab aktif saat digeser
  const onScroll = () => {
    const el = trackRef.current
    if (!el) return
    const idx = Math.round(el.scrollLeft / el.clientWidth)
    if (idx !== activeSlide) setActiveSlide(idx)
  }

  const goToSlide = (idx: number) => {
    const el = trackRef.current
    if (!el) return
    el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' })
    setActiveSlide(idx)
  }

  // Tab aktif ikut ter-scroll ke tengah
  useEffect(() => {
    const tabs = tabsRef.current
    if (!tabs) return
    const btn = tabs.children[activeSlide] as HTMLElement | undefined
    btn?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [activeSlide])

  const filtered = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [products, search],
  )

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name?.trim()) throw new Error('Nama produk wajib diisi')
      if (!form.category_id) throw new Error('Kategori wajib dipilih')
      if (editing) {
        return updateProduct(editing.id, { ...form, branch_stocks: branchStocks })
      }
      return createProduct({
        ...(form as Parameters<typeof createProduct>[0]),
        branch_stocks: branchStocks,
      })
    },
    onSuccess: () => {
      toast.success(editing ? 'Produk diperbarui' : 'Produk ditambahkan')
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['products-all-branches'] })
      setModal(false)
      setEditing(null)
      setForm(defaultForm)
      setBranchStocks({})
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      toast.success('Produk dihapus')
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['products-all-branches'] })
      setDeleteConfirm(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const stockMutation = useMutation({
    mutationFn: async () => {
      if (!stockEdit) throw new Error('Tidak ada produk dipilih')
      if (!user) throw new Error('Sesi tidak valid')
      return setBranchStock({
        product_id: stockEdit.product.id,
        branch_id: stockEdit.branchId,
        new_stock: stockEdit.value,
        user_id: user.id,
      })
    },
    onSuccess: () => {
      toast.success('Stok diperbarui')
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['products-all-branches'] })
      setStockEdit(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const openAdd = () => {
    setEditing(null)
    setForm(defaultForm)
    setBranchStocks(Object.fromEntries(activeBranches.map((b) => [b.id, 0])))
    setModal(true)
  }

  const openEdit = (product: ProductWithBranchStocks) => {
    setEditing(product)
    setForm({
      name: product.name,
      category_id: product.category_id,
      base_price: product.base_price,
      min_stock: product.min_stock,
      unit: product.unit,
      is_active: product.is_active,
    })
    setBranchStocks(
      Object.fromEntries(activeBranches.map((b) => [b.id, product.stocks_by_branch[b.id] ?? 0])),
    )
    setModal(true)
  }

  const stockOf = (p: ProductWithBranchStocks, key: string) =>
    key === TOTAL_KEY ? p.total_stock : p.stocks_by_branch[key] ?? 0

  const minStockOf = (p: ProductWithBranchStocks, key: string) =>
    key === TOTAL_KEY ? p.min_stock : p.min_stock_by_branch[key] ?? p.min_stock

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

      {/* Tab cabang */}
      <div
        ref={tabsRef}
        className="flex gap-2 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none' }}
      >
        {slides.map((s, i) => (
          <button
            key={s.key}
            onClick={() => goToSlide(i)}
            className="px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors"
            style={{
              background: i === activeSlide ? 'var(--accent-primary)' : 'var(--bg-secondary)',
              color: i === activeSlide ? '#fff' : 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Slide daftar produk per cabang */}
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex overflow-x-auto snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none' }}
      >
        {slides.map((slide) => {
          const isTotal = slide.key === TOTAL_KEY
          return (
            <div key={slide.key} className="w-full flex-shrink-0 snap-center pr-0">
              {isTotal && (
                <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                  Total stok semua cabang — geser ke samping dan pilih cabang untuk ubah stok.
                </p>
              )}
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Produk</th>
                      <th>Kategori</th>
                      <th>Harga</th>
                      <th>Stok {isTotal ? 'Total' : slide.label}</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10">
                          <span className="loading-spinner" style={{ color: 'var(--accent-primary)' }} />
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10" style={{ color: 'var(--text-muted)' }}>
                          Tidak ada produk
                        </td>
                      </tr>
                    ) : (
                      filtered.map((p) => {
                        const stock = stockOf(p, slide.key)
                        const min = minStockOf(p, slide.key)
                        return (
                          <tr key={p.id}>
                            <td>
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                                  <Package size={16} className="text-blue-500" />
                                </div>
                                <div>
                                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                    {p.name}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td style={{ color: 'var(--text-secondary)' }}>{p.category?.name ?? '-'}</td>
                            <td className="font-semibold" style={{ color: 'var(--accent-primary)' }}>
                              {formatCurrency(p.base_price)}
                            </td>
                            <td>
                              <span
                                className={`font-semibold ${stock <= min ? 'text-red-500' : ''}`}
                                style={{ color: stock <= min ? undefined : 'var(--text-primary)' }}
                              >
                                {stock} {p.unit}
                              </span>
                            </td>
                            <td>{statusBadge(p.is_active ? 'active' : 'inactive')}</td>
                            <td>
                              <div className="flex items-center gap-1">
                                {!isTotal && canStock && (
                                  <button
                                    onClick={() =>
                                      setStockEdit({
                                        product: p,
                                        branchId: slide.key,
                                        branchName: slide.label,
                                        value: stock,
                                      })
                                    }
                                    title={`Ubah stok di ${slide.label}`}
                                    className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600"
                                  >
                                    <Boxes size={15} />
                                  </button>
                                )}
                                {canEdit && (
                                  <button
                                    onClick={() => openEdit(p)}
                                    className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"
                                  >
                                    <Pencil size={15} />
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    onClick={() => setDeleteConfirm(p)}
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>

      {/* Ubah stok cabang */}
      <Modal
        isOpen={!!stockEdit}
        onClose={() => setStockEdit(null)}
        title={`Ubah Stok — ${stockEdit?.branchName ?? ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setStockEdit(null)}>
              Batal
            </Button>
            <Button
              variant="primary"
              loading={stockMutation.isPending}
              onClick={() => stockMutation.mutate()}
            >
              Simpan
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p style={{ color: 'var(--text-secondary)' }}>
            Produk: <strong style={{ color: 'var(--text-primary)' }}>{stockEdit?.product.name}</strong>
          </p>
          <Input
            label={`Stok baru di ${stockEdit?.branchName ?? ''}`}
            type="number"
            value={stockEdit?.value ?? 0}
            onChange={(e) =>
              setStockEdit((s) => (s ? { ...s, value: parseInt(e.target.value) || 0 } : s))
            }
          />
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Selisihnya otomatis dicatat sebagai penyesuaian di riwayat stok.
          </p>
        </div>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Edit Produk' : 'Tambah Produk'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)}>
              Batal
            </Button>
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
          <div className="col-span-2">
            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Stok per Cabang
            </p>
            <div className="grid grid-cols-2 gap-3">
              {activeBranches.map((b) => (
                <Input
                  key={b.id}
                  label={b.name}
                  type="number"
                  value={branchStocks[b.id] ?? 0}
                  onChange={(e) =>
                    setBranchStocks((s) => ({ ...s, [b.id]: parseInt(e.target.value) || 0 }))
                  }
                />
              ))}
            </div>
          </div>
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
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Batal
            </Button>
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
          Yakin ingin menghapus produk{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{deleteConfirm?.name}</strong>? Tindakan ini
          tidak dapat dibatalkan.
        </p>
      </Modal>
    </div>
  )
}

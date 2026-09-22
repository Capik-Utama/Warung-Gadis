import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, ShoppingCart, CheckSquare, Square,
  CreditCard, Banknote, QrCode, User, Minus, Plus, Star, GitBranch,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { fetchProducts, fetchProductsAllBranchesForCashier } from '@/services/productService'
import { fetchCategories } from '@/services/categoryService'
import { fetchBranches } from '@/services/branchService'
import { createTransaction, fetchPendingTransactions, payTransactionItems } from '@/services/transactionService'
import { createDebt, fetchDebtMembers } from '@/services/debtService'
import { getActiveShift } from '@/services/shiftService'
import { STAFF_SHIFT_REQUIRED_MESSAGE } from '@/services/accessGuardService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency, formatDateTime } from '@/utils/format'
import type { Branch, CartItem, Product, PaymentMethod, Transaction } from '@/types'

const STORAGE_KEY = 'wg-favorites'

type ViewTab = 'all' | 'favorit' | string // string = category id

function useFavorites(userId: string) {
  const key = `${STORAGE_KEY}-${userId}`
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(key) ?? '[]') } catch { return [] }
  })
  const toggle = (id: string) => {
    const next = favorites.includes(id) ? favorites.filter((f: string) => f !== id) : [...favorites, id]
    setFavorites(next)
    localStorage.setItem(key, JSON.stringify(next))
  }
  return { favorites, toggle }
}

export default function KasirPage() {
  const navigate = useNavigate()
  const { user, selectedBranch, hasPermission, allowedBranchIds, setSelectedBranch } = useAuthStore()

  const isDeveloperOrManager = user?.role === 'developer' || user?.role === 'manager'
  const canAccessKasir = hasPermission('access_kasir')
  const cart = useCartStore()
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<ViewTab>('all')
  const [payModal, setPayModal] = useState(false)
  const [debtModal, setDebtModal] = useState(false)
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash')
  const [paidAmount, setPaidAmount] = useState('')
  const [debtName, setDebtName] = useState('')
  const [debtPhone, setDebtPhone] = useState('')
  const [debtAddress, setDebtAddress] = useState('')
  const [showMemberSuggestions, setShowMemberSuggestions] = useState(false)
  const [showAllBranches, setShowAllBranches] = useState(false)
  const [showPending, setShowPending] = useState(false)
  const [pendingToPay, setPendingToPay] = useState<Transaction | null>(null)

  const branchId = selectedBranch?.id ?? ''
  const allBranchesSelected = isDeveloperOrManager && showAllBranches
  const { favorites, toggle: toggleFavorite } = useFavorites(user?.id ?? '')
  const { data: activeShift } = useQuery({
    queryKey: ['active-shift', user?.id],
    queryFn: () => getActiveShift(user!.id),
    enabled: !!user && user.role === 'staff',
    refetchInterval: 30_000,
  })
  const isReadOnly = (user?.role === 'staff' && !activeShift) || !branchId

  const goToShiftPage = useCallback(() => {
    toast(STAFF_SHIFT_REQUIRED_MESSAGE)
    navigate('/shift')
  }, [navigate])

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })

  const { data: debtMembers = [] } = useQuery({
    queryKey: ['debt-members'],
    queryFn: fetchDebtMembers,
  })

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: fetchBranches,
  })

  const availableBranches = useMemo(() => {
    if (!user) return []
    if (isDeveloperOrManager) {
      return branches.filter((branch) => branch.is_active)
    }
    return branches.filter((branch) => branch.is_active && allowedBranchIds.includes(branch.id))
  }, [allowedBranchIds, branches, isDeveloperOrManager, user])

  const selectedBranchLabel = selectedBranch?.name ?? 'Belum dipilih'

  // Filter members based on debtName input
  const filteredMembers = debtMembers.filter(name =>
    name.toLowerCase().includes(debtName.toLowerCase())
  )

  // Load products (all branches when no branch selected)
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products', allBranchesSelected ? 'all-branches' : branchId],
    queryFn: () => allBranchesSelected ? fetchProductsAllBranchesForCashier() : fetchProducts(branchId),
  })

  const { data: pendingTransactions = [], isLoading: loadingPending } = useQuery({
    queryKey: ['pending-transactions', branchId],
    queryFn: () => fetchPendingTransactions(branchId),
    enabled: !!branchId,
    refetchInterval: 15_000,
  })

  // Produk dengan stok 0 tidak boleh muncul atau tetap tercentang.
  // Kategori tetap berasal dari query categories, jadi kategori kosong tetap tampil.
  useEffect(() => {
    if ((!branchId && !allBranchesSelected) || loadingProducts) return
    if (allBranchesSelected && cart.items.length > 0) {
      cart.clearCart()
      return
    }
    products.forEach((product) => {
      if ((product.stock ?? 0) <= 0 && cart.items.some((item) => item.product.id === product.id)) {
        cart.removeItem(product.id)
      }
    })
  }, [allBranchesSelected, branchId, cart, cart.items, loadingProducts, products])

  useEffect(() => {
    if (pendingToPay && pendingToPay.branch_id !== branchId) {
      setPendingToPay(null)
      cart.clearCart()
    }
  }, [branchId, cart, pendingToPay])

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.is_active || (p.stock ?? 0) <= 0) return false
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
      if (activeTab === 'all') return matchSearch
      if (activeTab === 'favorit') return matchSearch && favorites.includes(p.id)
      return matchSearch && p.category_id === activeTab
    })
  }, [products, search, activeTab, favorites])

  const checkedTotal = cart.getCheckedTotal()
  const checkedCount = cart.getCheckedCount()
  const checkedItems = cart.getCheckedItems()
  const paid = parseInt(paidAmount.replace(/\D/g, ''), 10) || 0
  const change = paid - checkedTotal

  // ─── ACTIONS ───

  // Ceklis produk: langsung pakai store method yang sudah handle add+toggle
  const handleCheckProduct = useCallback((product: Product) => {
    if (pendingToPay) {
      toast('Selesaikan pembayaran Pending terlebih dahulu.')
      return
    }
    cart.toggleCheckbox(product.id, product, product.base_price)
  }, [cart, pendingToPay])

  // Set qty dari input field
  const handleQtyChange = useCallback((productId: string, value: string) => {
    if (pendingToPay) return
    const num = parseInt(value, 10)
    if (num >= 0) {
      cart.setQty(productId, num)
    }
  }, [cart, pendingToPay])

  const openPendingOrder = useCallback((pending: Transaction) => {
    const items: CartItem[] = (pending.items ?? []).map((item) => {
      const product = products.find((candidate) => candidate.id === item.product_id)
        ?? ({
          id: item.product_id,
          name: (item.product as Product | undefined)?.name ?? 'Produk',
          category_id: '',
          base_price: item.unit_price,
          stock: 1,
          min_stock: 0,
          unit: (item.product as Product | undefined)?.unit ?? 'pcs',
          image_url: null,
          is_active: true,
          created_at: '',
          updated_at: '',
        } as Product)
      return {
        product,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        selected: true,
        checked: true,
      }
    })
    if (items.length === 0) {
      toast.error('Pesanan Pending tidak memiliki item.')
      return
    }
    cart.loadItems(items)
    setPendingToPay(pending)
    setShowPending(false)
    toast.success(`Pesanan ${pending.code} siap dibayar`)
  }, [cart, products])

  const pendingMutation = useMutation({
    mutationFn: async () => {
      if (!user || !branchId) throw new Error('Pilih cabang terlebih dahulu')
      if (checkedItems.length === 0) throw new Error('Pilih produk yang ingin ditunda')
      if (pendingToPay) throw new Error('Selesaikan pembayaran Pending terlebih dahulu')
      return createTransaction({
        branchId,
        userId: user.id,
        items: checkedItems.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
        status: 'pending',
        notes: 'Pesanan Pending untuk dilanjutkan staf berikutnya',
      })
    },
    onSuccess: () => {
      toast.success('Pesanan masuk Pending')
      cart.clearCart()
      qc.invalidateQueries({ queryKey: ['pending-transactions', branchId] })
      qc.invalidateQueries({ queryKey: ['products', branchId] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // BAYAR
  const payMutation = useMutation({
    mutationFn: async () => {
      if (isReadOnly) throw new Error(STAFF_SHIFT_REQUIRED_MESSAGE)
      if (!user || !branchId) throw new Error('Session tidak valid')
      if (checkedCount === 0) throw new Error('Pilih item yang ingin dibayar')

      const items = checkedItems.map((i) => ({
        product_id: i.product.id,
        quantity: i.quantity,
        unit_price: i.unit_price,
      }))

      if (pendingToPay) {
        await payTransactionItems(
          pendingToPay.id,
          (pendingToPay.items ?? []).map((item) => item.id),
          payMethod,
          payMethod === 'cash' ? paid : checkedTotal,
          user.id,
        )
      } else {
        await createTransaction({
          branchId,
          userId: user.id,
          items,
          paymentMethod: payMethod,
          paidAmount: paid,
          status: 'paid',
        })
      }
    },
    onSuccess: () => {
      toast.success('Pembayaran berhasil!')
      cart.clearCart()
      setPayModal(false)
      setPaidAmount('')
      setPayMethod('cash')
      setPendingToPay(null)
      qc.invalidateQueries({ queryKey: ['pending-transactions', branchId] })
      qc.invalidateQueries({ queryKey: ['products', branchId] })
      qc.invalidateQueries({ queryKey: ['today-stats'] })
      
      // Developer & Manager harus pilih cabang lagi setelah transaksi
      if (user?.role === 'developer' || user?.role === 'manager') {
        setSelectedBranch(null)
      }
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // HUTANG
  const debtMutation = useMutation({
    mutationFn: async () => {
      if (isReadOnly) throw new Error(STAFF_SHIFT_REQUIRED_MESSAGE)
      if (!user || !branchId) throw new Error('Session tidak valid')
      if (!debtName.trim()) throw new Error('Nama pelanggan wajib diisi')
      if (checkedCount === 0) throw new Error('Pilih item yang ingin dicatat sebagai member')

      const items = checkedItems.map((i) => ({
        product_id: i.product.id,
        quantity: i.quantity,
        unit_price: i.unit_price,
      }))

      const totalAmount = checkedItems.reduce((s, i) => s + i.subtotal, 0)

      const trx = await createTransaction({
        branchId,
        userId: user.id,
        items,
        customerName: debtName,
        customerPhone: debtPhone,
        status: 'debt',
      })

      await createDebt({
        transaction_id: trx.id,
        branch_id: branchId,
        customer_name: debtName,
        customer_address: debtAddress || undefined,
        customer_phone: debtPhone,
        total_amount: totalAmount,
      })
    },
    onSuccess: () => {
      toast.success('Member berhasil dicatat!')
      cart.clearCart()
      setDebtModal(false)
      setDebtName('')
      setDebtPhone('')
      setDebtAddress('')
      qc.invalidateQueries({ queryKey: ['debts'] })

      // Developer & Manager harus pilih cabang lagi setelah transaksi
      if (user?.role === 'developer' || user?.role === 'manager') {
        setSelectedBranch(null)
      }
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // ─── RENDER ───

  if (!canAccessKasir) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <ShoppingCart size={32} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Akses Ditolak</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Anda tidak memiliki hak akses untuk menggunakan Kasir.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
      {isDeveloperOrManager && (
        <div className="card p-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                <GitBranch size={14} />
                Cabang Transaksi
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Pilih cabang hanya saat ingin transaksi. Pilih cabang terlebih dahulu untuk memulai transaksi.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setShowAllBranches(true)
                  setSelectedBranch(null)
                }}
                className="px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors"
                style={{
                  borderColor: allBranchesSelected ? 'var(--accent-primary)' : 'var(--border-color)',
                  background: allBranchesSelected ? 'rgba(37,99,235,0.08)' : 'var(--bg-card)',
                  color: allBranchesSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                }}
              >
                Semuanya
              </button>
              {availableBranches.map((branch: Branch) => {
                const isSelected = selectedBranch?.id === branch.id
                return (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => {
                      setShowAllBranches(false)
                      setSelectedBranch(isSelected ? null : branch)
                    }}
                    className="px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors"
                    style={{
                      borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-color)',
                      background: isSelected ? 'rgba(37,99,235,0.08)' : 'var(--bg-card)',
                      color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                      opacity: branch.is_operational ? 1 : 0.65,
                    }}
                  >
                    <span>{branch.name}</span>
                    {!branch.is_operational && <span className="ml-2 text-[10px] font-semibold">TUTUP</span>}
                  </button>
                )
              })}
            </div>
          </div>
          <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
            Cabang aktif: {allBranchesSelected ? 'Semuanya' : selectedBranchLabel}
          </p>
        </div>
      )}

      {/* Search bar */}
      <div className="flex gap-2">
        <Input
          placeholder="Cari produk..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search size={16} />}
          className="flex-1"
        />
      </div>

      {isReadOnly && (
        <div className="card p-3 border-l-4 border-amber-400">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-amber-700">Read Only</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {!branchId
                  ? 'Anda melihat data semua cabang. Pilih cabang terlebih dahulu untuk bertransaksi.'
                  : 'Belum masuk shift. Aksi transaksi dikunci sampai masuk shift.'
                }
              </p>
            </div>
            {!(!branchId && isDeveloperOrManager) && (
              <Button variant="warning" onClick={goToShiftPage}>Masuk Shift</Button>
            )}
          </div>
        </div>
      )}

      {/* PRODUCT FILTERS */}
      <div className="flex gap-1 overflow-x-auto pb-0.5 flex-shrink-0">
        <TabButton
          active={showPending}
          onClick={() => setShowPending((value) => !value)}
          badge={pendingTransactions.length > 0 ? pendingTransactions.length : undefined}
          color="amber"
        >
          Pending
        </TabButton>
        <TabButton
          active={activeTab === 'favorit'}
          onClick={() => setActiveTab('favorit')}
          badge={favorites.length > 0 ? favorites.length : undefined}
          color="green"
        >
          FAVORIT
        </TabButton>
        <TabButton
          active={activeTab === 'all'}
          onClick={() => setActiveTab('all')}
          color="blue"
        >
          Semua
        </TabButton>
        {categories.map((cat) => (
          <TabButton
            key={cat.id}
            active={activeTab === cat.id}
            onClick={() => setActiveTab(cat.id)}
            color="blue"
          >
            {cat.name}
          </TabButton>
        ))}
      </div>

      <Modal isOpen={showPending} onClose={() => setShowPending(false)} title="Pesanan Pending" size="md">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Pilih pesanan untuk dilanjutkan pembayarannya.
              </p>
            </div>
            <span className="text-xs font-semibold" style={{ color: 'var(--accent-primary)' }}>
              {pendingTransactions.length} pesanan
            </span>
          </div>
          {!branchId ? (
            <p className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>Pilih cabang untuk melihat Pending.</p>
          ) : loadingPending ? (
            <p className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>Memuat Pending...</p>
          ) : pendingTransactions.length === 0 ? (
            <p className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>Belum ada pesanan Pending.</p>
          ) : (
            <div className="space-y-1.5">
              {pendingTransactions.map((pending) => (
                <button
                  key={pending.id}
                  type="button"
                  onClick={() => openPendingOrder(pending)}
                  disabled={!!pendingToPay}
                  className="w-full text-left rounded-lg border px-2.5 py-2 transition-colors hover:bg-blue-50 disabled:opacity-50"
                  style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold" style={{ color: 'var(--accent-primary)' }}>{pending.code}</span>
                    <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(pending.total_amount)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    <span>{pending.items?.length ?? 0} item</span>
                    <span>•</span>
                    <span>{pending.user?.name ?? 'Staf sebelumnya'}</span>
                    <span>•</span>
                    <span>{formatDateTime(pending.created_at)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Product list scrolls together with the branch and status panels. */}
      <div>
        <div className="space-y-1 pr-1">
          {loadingProducts ? (
            <div className="flex justify-center py-10">
              <span className="loading-spinner" style={{ color: 'var(--accent-primary)' }} />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              Produk tidak ditemukan
            </div>
          ) : (
            filteredProducts.map((product) => {
              const isChecked = cart.isChecked(product.id)
              const cartItem = cart.items.find((i) => i.product.id === product.id)
              const qty = cartItem?.quantity ?? 1
              const subtotal = qty * product.base_price

              return (
                <div
                  key={product.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors"
                  style={{
                    background: isChecked ? 'rgba(37,99,235,0.05)' : 'var(--bg-card)',
                    border: `1px solid ${isChecked ? 'rgba(37,99,235,0.2)' : 'var(--border-color)'}`,
                  }}
                >
                  <button
                    onClick={() => handleCheckProduct(product)}
                    style={{ color: isChecked ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                    className="flex-shrink-0"
                  >
                    {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {product.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold" style={{ color: 'var(--accent-primary)' }}>
                        {formatCurrency(product.base_price)}
                      </span>
                      {product.stock <= product.min_stock && product.stock > 0 && (
                        <span className="text-[10px] px-1 rounded bg-amber-100 text-amber-600">menipis</span>
                      )}
                      {product.stock <= 0 && (
                        <span className="text-[10px] px-1 rounded bg-red-100 text-red-600">habis</span>
                      )}
                    </div>
                  </div>
                  {isChecked ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleQtyChange(product.id, String(Math.max(0, qty - 1)))} className="w-6 h-6 rounded-md flex items-center justify-center text-xs" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                          <Minus size={12} />
                        </button>
                        <input type="number" value={String(qty)} onChange={(e) => handleQtyChange(product.id, e.target.value)} className="w-10 text-center text-sm font-bold bg-transparent border-0 outline-none" style={{ color: 'var(--text-primary)' }} min={0} />
                        <button onClick={() => handleQtyChange(product.id, String(qty + 1))} className="w-6 h-6 rounded-md flex items-center justify-center text-xs" style={{ background: 'var(--accent-primary)', color: 'white' }}>
                          <Plus size={12} />
                        </button>
                      </div>
                      {subtotal > 0 && <span className="text-xs font-bold text-green-600 w-20 text-right">{formatCurrency(subtotal)}</span>}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                        Stok: {product.stock}
                        <button onClick={() => toggleFavorite(product.id)} className="flex-shrink-0 transition-colors" style={{ color: favorites.includes(product.id) ? '#fbbf24' : 'var(--text-muted)' }}>
                          <Star size={14} fill={favorites.includes(product.id) ? '#fbbf24' : 'none'} />
                        </button>
                      </span>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
      </div>

      {/* Action menu stays visible as soon as a product is checked. */}
      {checkedCount > 0 && (
        <div
          className="flex-shrink-0 p-2 rounded-xl border flex flex-col gap-1.5 shadow-lg"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {pendingToPay ? `Pending ${pendingToPay.code}` : `${checkedCount} item dipilih`}
            </span>
            <p className="text-base font-bold" style={{ color: 'var(--accent-primary)' }}>
              {formatCurrency(checkedTotal)}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <Button
              variant="warning"
              className="text-[11px] px-1 py-1.5 min-h-0 h-9"
              onClick={isReadOnly || !!pendingToPay ? goToShiftPage : () => pendingMutation.mutate()}
              disabled={isReadOnly || !!pendingToPay}
              loading={pendingMutation.isPending}
            >
              PENDING
            </Button>
            <Button
              variant="danger"
              className="text-[11px] px-1 py-1.5 min-h-0 h-9"
              onClick={isReadOnly ? goToShiftPage : () => setDebtModal(true)}
              disabled={isReadOnly}
            >
              MEMBER
            </Button>
            <Button
              variant="success"
              className="text-[11px] px-1 py-1.5 min-h-0 h-9"
              onClick={isReadOnly ? goToShiftPage : () => setPayModal(true)}
              disabled={isReadOnly}
              icon={<CreditCard size={14} />}
            >
              BAYAR
            </Button>
          </div>
        </div>
      )}

      {/* ─── PAY MODAL ─── */}
      <Modal
        isOpen={payModal}
        onClose={() => setPayModal(false)}
        title="Pembayaran"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPayModal(false)}>Batal</Button>
            <Button
              variant="success"
              loading={payMutation.isPending}
              onClick={() => payMutation.mutate()}
              disabled={payMethod === 'cash' && paid < checkedTotal}
            >
              Konfirmasi Bayar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl" style={{ background: 'var(--bg-primary)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Item ({checkedCount}):
            </p>
            {checkedItems.map((item) => (
              <div key={item.product.id} className="flex justify-between text-sm py-0.5">
                <span style={{ color: 'var(--text-primary)' }}>
                  {item.product.name} x{item.quantity}
                </span>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  {formatCurrency(item.subtotal)}
                </span>
              </div>
            ))}
            <div className="flex justify-between mt-2 pt-2 font-bold text-base" style={{ borderTop: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-primary)' }}>Total</span>
              <span style={{ color: 'var(--accent-primary)' }}>{formatCurrency(checkedTotal)}</span>
            </div>
          </div>

          <div>
            <p className="label">Metode Pembayaran</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'cash' as const, label: 'Cash', icon: <Banknote size={18} /> },
                { key: 'qris' as const, label: 'QRIS', icon: <QrCode size={18} /> },
                { key: 'transfer' as const, label: 'Transfer', icon: <CreditCard size={18} /> },
              ]).map((m) => (
                <button
                  key={m.key}
                  onClick={() => setPayMethod(m.key)}
                  className="p-2.5 rounded-xl border-2 flex flex-col items-center gap-1 transition-all"
                  style={{
                    borderColor: payMethod === m.key ? 'var(--accent-primary)' : 'var(--border-color)',
                    background: payMethod === m.key ? 'rgba(37,99,235,0.05)' : 'var(--bg-primary)',
                    color: payMethod === m.key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  }}
                >
                  {m.icon}
                  <span className="text-xs font-medium">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {payMethod === 'cash' && (
            <>
              <Input
                label="Jumlah Diterima"
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder="0"
              />
              {paid >= checkedTotal && (
                <div className="flex justify-between p-3 rounded-xl" style={{ background: 'var(--bg-primary)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Kembalian</span>
                  <span className="font-bold text-green-500">{formatCurrency(change)}</span>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>

      {/* ─── DEBT MODAL ─── */}
      <Modal
        isOpen={debtModal}
        onClose={() => setDebtModal(false)}
        title="Catat Member"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDebtModal(false)}>Batal</Button>
            <Button
              variant="danger"
              loading={debtMutation.isPending}
              onClick={() => debtMutation.mutate()}
              disabled={!debtName.trim()}
            >
              Jadikan Member
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl" style={{ background: 'var(--bg-primary)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Item member ({checkedCount}):
            </p>
            {checkedItems.map((item) => (
              <div key={item.product.id} className="flex justify-between text-sm py-0.5">
                <span style={{ color: 'var(--text-primary)' }}>
                  {item.product.name} x{item.quantity}
                </span>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  {formatCurrency(item.subtotal)}
                </span>
              </div>
            ))}
            <div className="flex justify-between mt-2 pt-2 font-bold text-base" style={{ borderTop: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-primary)' }}>Total Member</span>
              <span className="text-red-500">{formatCurrency(checkedTotal)}</span>
            </div>
          </div>

          <div className="relative">
            <Input
              label="Nama Pelanggan *"
              value={debtName}
              onChange={(e) => {
                setDebtName(e.target.value)
                setShowMemberSuggestions(true)
              }}
              onFocus={() => setShowMemberSuggestions(true)}
              placeholder="Masukkan nama pelanggan"
              leftIcon={<User size={16} />}
            />
            {showMemberSuggestions && filteredMembers.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                {filteredMembers.map((member) => (
                  <button
                    key={member}
                    onClick={() => {
                      setDebtName(member)
                      setShowMemberSuggestions(false)
                    }}
                    className="w-full text-left px-3 py-2 hover:opacity-70 transition-opacity border-b"
                    style={{ color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                  >
                    <p className="text-sm font-medium">{member}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Input
            label="Alamat"
            value={debtAddress}
            onChange={(e) => setDebtAddress(e.target.value)}
            placeholder="Alamat lengkap pelanggan"
          />
          <Input
            label="Nomor HP (Opsional)"
            value={debtPhone}
            onChange={(e) => setDebtPhone(e.target.value)}
            placeholder="08xxxxxxxxxx"
          />
          {debtMembers.length > 0 && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              💡 Tip: Ketik nama untuk melihat member yang sudah pernah berhutang sebelumnya
            </p>
          )}
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Member bisa dilihat dan dibayar oleh semua staf di semua cabang.
          </p>
        </div>
      </Modal>
    </div>
  )
}

// ─── COMPONENTS ───

function TabButton({
  children,
  active,
  onClick,
  badge,
  color,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
  badge?: number
  color: 'blue' | 'amber' | 'green' | 'red'
}) {
  const activeStyles: Record<string, string> = {
    blue: 'var(--accent-primary)',
    amber: '#f59e0b',
    green: '#22c55e',
    red: '#ef4444',
  }
  const colorVal = activeStyles[color] ?? 'var(--accent-primary)'

  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1 whitespace-nowrap"
      style={{
        background: active ? colorVal : 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        color: active ? 'white' : 'var(--text-primary)',
      }}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span
          className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold text-white"
          style={{ background: colorVal }}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

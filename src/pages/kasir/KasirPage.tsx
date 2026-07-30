import React, { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, ShoppingCart, CheckSquare, Square,
  CreditCard, Banknote, QrCode, User, X, Clock, AlertCircle, Minus, Plus, Star,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { fetchProducts } from '@/services/productService'
import { fetchCategories } from '@/services/categoryService'
import {
  createTransaction,
  fetchPendingTransactions,
  cancelTransactionItems,
} from '@/services/transactionService'
import { createDebt, fetchDebtMembers } from '@/services/debtService'
import { getActiveShift } from '@/services/shiftService'
import { STAFF_SHIFT_REQUIRED_MESSAGE } from '@/services/accessGuardService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency } from '@/utils/format'
import type { Product, PaymentMethod, Transaction, TransactionItem } from '@/types'

const STORAGE_KEY = 'wg-favorites'

type ViewTab = 'all' | 'pending' | 'favorit' | string // string = category id

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
  const { user, selectedBranch } = useAuthStore()
  const cart = useCartStore()
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<ViewTab>('pending')
  const [payModal, setPayModal] = useState(false)
  const [debtModal, setDebtModal] = useState(false)
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash')
  const [paidAmount, setPaidAmount] = useState('')
  const [debtName, setDebtName] = useState('')
  const [debtPhone, setDebtPhone] = useState('')
  const [debtAddress, setDebtAddress] = useState('')
  const [showMemberSuggestions, setShowMemberSuggestions] = useState(false)

  const branchId = selectedBranch?.id ?? ''
  const { favorites, toggle: toggleFavorite } = useFavorites(user?.id ?? '')
  const isStaff = user?.role === 'staff'
  const { data: activeShift } = useQuery({
    queryKey: ['active-shift', user?.id],
    queryFn: () => getActiveShift(user!.id),
    enabled: !!user && isStaff,
    refetchInterval: 30_000,
  })
  const isStaffReadOnly = isStaff && (!activeShift || !branchId)

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

  // Filter members based on debtName input
  const filteredMembers = debtMembers.filter(name =>
    name.toLowerCase().includes(debtName.toLowerCase())
  )

  // Load products (all branches when no branch selected)
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products', branchId],
    queryFn: () => fetchProducts(branchId),
  })

  // Fetch pending transactions (all branches when no branch selected)
  const { data: pendingTransactions = [], refetch: refetchPending } = useQuery({
    queryKey: ['pending-transactions', branchId],
    queryFn: () => fetchPendingTransactions(branchId),
  })

  // Flatten pending items
  const pendingItems = useMemo(() => {
    const flat: {
      id: string
      transaction_id: string
      product_id: string
      product_name: string
      quantity: number
      unit_price: number
      subtotal: number
      code: string
      branch_id: string
    }[] = []
    pendingTransactions.forEach((trx) => {
      (trx.items ?? []).forEach((item: TransactionItem) => {
        if (item.status === 'pending') {
          flat.push({
            id: item.id,
            transaction_id: item.transaction_id,
            product_id: item.product_id,
            product_name: item.product?.name ?? 'Unknown',
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
            code: trx.code,
            branch_id: trx.branch_id,
          })
        }
      })
    })
    return flat
  }, [pendingTransactions])

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
      if (activeTab === 'all') return matchSearch && p.is_active
      if (activeTab === 'pending') return matchSearch && p.is_active
      if (activeTab === 'favorit') return matchSearch && p.is_active && favorites.includes(p.id)
      return matchSearch && p.category_id === activeTab && p.is_active
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
    cart.toggleCheckbox(product.id, product, product.base_price)
  }, [cart])

  // Set qty dari input field
  const handleQtyChange = useCallback((productId: string, value: string) => {
    const num = parseInt(value, 10)
    if (num >= 0) {
      cart.setQty(productId, num)
    }
  }, [cart])

  // OTW PENDING
  const handleOtwPending = useCallback(() => {
    if (isStaffReadOnly) {
      goToShiftPage()
      return
    }
    if (checkedCount === 0) {
      toast.error('Ceklis minimal 1 produk')
      return
    }
    if (!user || !branchId) {
      toast.error('Session tidak valid')
      return
    }

    const items = checkedItems.map((i) => ({
      product_id: i.product.id,
      quantity: i.quantity,
      unit_price: i.unit_price,
    }))

    toast.promise(
      createTransaction({
        branchId,
        userId: user.id,
        items,
        status: 'pending',
      }),
      {
        loading: 'Memproses pending...',
        success: () => {
          toast.success(`${checkedCount} item masuk pending!`)
          setPayModal(false)
          setDebtModal(false)
          refetchPending()
          qc.invalidateQueries({ queryKey: ['products'] })
          return 'Berhasil'
        },
        error: (e: Error) => e.message,
      },
    )
  }, [isStaffReadOnly, goToShiftPage, checkedCount, checkedItems, user, branchId, refetchPending, qc])

  // BAYAR
  const payMutation = useMutation({
    mutationFn: async () => {
      if (isStaffReadOnly) throw new Error(STAFF_SHIFT_REQUIRED_MESSAGE)
      if (!user || !branchId) throw new Error('Session tidak valid')
      if (checkedCount === 0) throw new Error('Pilih item yang ingin dibayar')

      const items = checkedItems.map((i) => ({
        product_id: i.product.id,
        quantity: i.quantity,
        unit_price: i.unit_price,
      }))

      await createTransaction({
        branchId,
        userId: user.id,
        items,
        paymentMethod: payMethod,
        paidAmount: paid,
        status: 'paid',
      })
    },
    onSuccess: () => {
      toast.success('Pembayaran berhasil!')
      cart.clearCart()
      setPayModal(false)
      setPaidAmount('')
      setPayMethod('cash')
      qc.invalidateQueries({ queryKey: ['today-stats'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      refetchPending()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // HUTANG
  const debtMutation = useMutation({
    mutationFn: async () => {
      if (isStaffReadOnly) throw new Error(STAFF_SHIFT_REQUIRED_MESSAGE)
      if (!user || !branchId) throw new Error('Session tidak valid')
      if (!debtName.trim()) throw new Error('Nama pelanggan wajib diisi')
      if (checkedCount === 0) throw new Error('Pilih item yang ingin dicatat sebagai hutang')

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
      toast.success('Hutang berhasil dicatat!')
      cart.clearCart()
      setDebtModal(false)
      setDebtName('')
      setDebtPhone('')
      setDebtAddress('')
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['debts'] })
      refetchPending()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // ─── RENDER ───

  return (
    <div className="flex flex-col gap-3 h-full">
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

      {isStaffReadOnly && (
        <div className="card p-4 border-l-4 border-amber-400">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-amber-700">Read Only</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                {!branchId
                  ? 'Anda melihat data semua cabang. Masuk shift dan pilih cabang untuk bertransaksi.'
                  : 'Belum masuk shift. Aksi transaksi dikunci sampai masuk shift.'
                }
              </p>
            </div>
            <Button variant="warning" onClick={goToShiftPage}>Masuk Shift</Button>
          </div>
        </div>
      )}

      {/* TAB BAR */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <TabButton
          active={activeTab === 'pending'}
          onClick={() => setActiveTab('pending')}
          badge={pendingTransactions.length > 0 ? pendingTransactions.length : undefined}
          color="amber"
        >
          PENDING
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

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'pending' ? (
          <PendingView
            items={pendingItems}
            onRefetch={refetchPending}
            branchId={branchId}
            userId={user?.id ?? ''}
            isReadOnly={isStaffReadOnly}
            onLockedAction={goToShiftPage}
            onRefresh={() => {
              refetchPending()
              qc.invalidateQueries({ queryKey: ['products'] })
            }}
          />
        ) : (
          <div className="space-y-1">
            {loadingProducts ? (
              <div className="flex justify-center py-16">
                <span className="loading-spinner" style={{ color: 'var(--accent-primary)' }} />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
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
                    className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors"
                    style={{
                      background: isChecked ? 'rgba(37,99,235,0.05)' : 'var(--bg-card)',
                      border: `1px solid ${isChecked ? 'rgba(37,99,235,0.2)' : 'var(--border-color)'}`,
                    }}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => handleCheckProduct(product)}
                      style={{ color: isChecked ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                      className="flex-shrink-0"
                    >
                      {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>

                    {/* Product info */}
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

                    {/* Qty + Subtotal + Favorite */}
                    {isChecked ? (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleQtyChange(product.id, String(Math.max(0, qty - 1)))}
                            className="w-6 h-6 rounded-md flex items-center justify-center text-xs"
                            style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                          >
                            <Minus size={12} />
                          </button>
                          <input
                            type="number"
                            value={String(qty)}
                            onChange={(e) => handleQtyChange(product.id, e.target.value)}
                            className="w-10 text-center text-sm font-bold bg-transparent border-0 outline-none"
                            style={{ color: 'var(--text-primary)' }}
                            min={0}
                          />
                          <button
                            onClick={() => handleQtyChange(product.id, String(qty + 1))}
                            className="w-6 h-6 rounded-md flex items-center justify-center text-xs"
                            style={{ background: 'var(--accent-primary)', color: 'white' }}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        {subtotal > 0 && (
                          <span className="text-xs font-bold text-green-600 w-20 text-right">
                            {formatCurrency(subtotal)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                          Stok: {product.stock}
                          <button
                            onClick={() => toggleFavorite(product.id)}
                            className="flex-shrink-0 transition-colors"
                            style={{ color: favorites.includes(product.id) ? '#fbbf24' : 'var(--text-muted)' }}
                          >
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
        )}
      </div>

      {/* BOTTOM BAR */}
      {activeTab !== 'pending' && activeTab !== 'favorit' && (
        <div
          className="flex-shrink-0 p-3 rounded-xl border flex flex-col gap-2"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {checkedCount} item dipilih
              </span>
              <p className="text-lg font-bold" style={{ color: 'var(--accent-primary)' }}>
                {formatCurrency(checkedTotal)}
              </p>
            </div>
            {checkedCount === 0 && cart.items.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <AlertCircle size={12} />
                <span>Ceklis produk</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="success"
              className="text-xs py-2"
              onClick={isStaffReadOnly ? goToShiftPage : handleOtwPending}
              disabled={isStaffReadOnly || checkedCount === 0}
            >
              OTW PENDING
            </Button>
            <Button
              variant="danger"
              className="text-xs py-2"
              onClick={isStaffReadOnly ? goToShiftPage : () => setDebtModal(true)}
              disabled={isStaffReadOnly || checkedCount === 0}
            >
              HUTANG
            </Button>
            <Button
              variant="primary"
              className="text-xs py-2"
              onClick={isStaffReadOnly ? goToShiftPage : () => setPayModal(true)}
              disabled={isStaffReadOnly || checkedCount === 0}
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
        title="Catat Hutang"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDebtModal(false)}>Batal</Button>
            <Button
              variant="danger"
              loading={debtMutation.isPending}
              onClick={() => debtMutation.mutate()}
              disabled={!debtName.trim()}
            >
              Jadikan Hutang
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl" style={{ background: 'var(--bg-primary)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Item hutang ({checkedCount}):
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
              <span style={{ color: 'var(--text-primary)' }}>Total Hutang</span>
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
            Hutang bisa dilihat dan dibayar oleh semua staf di semua cabang.
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
      className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap"
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

// ─── PENDING VIEW ───

function PendingView({
  items,
  onRefetch,
  branchId,
  userId,
  isReadOnly,
  onLockedAction,
  onRefresh,
}: {
  items: {
    id: string
    transaction_id: string
    product_id: string
    product_name: string
    quantity: number
    unit_price: number
    subtotal: number
    code: string
    branch_id: string
  }[]
  onRefetch: () => void
  branchId: string
  userId: string
  isReadOnly: boolean
  onLockedAction: () => void
  onRefresh: () => void
}) {
  const qc = useQueryClient()
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  const selectedItemsList = items.filter((i) => selectedItems.has(i.id))
  const totalSelected = selectedItemsList.reduce((s, i) => s + i.subtotal, 0)

  const toggleItem = (id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handlePayPending = async (method: PaymentMethod) => {
    if (isReadOnly) {
      onLockedAction()
      return
    }
    if (selectedItemsList.length === 0) {
      toast.error('Pilih item yang ingin dibayar')
      return
    }
    if (!userId) {
      toast.error('Session tidak valid')
      return
    }

    // Use the item's own branch_id for the transaction (works across all branches)
    const effectiveBranchId = branchId || selectedItemsList[0].branch_id

    try {
      // Create a NEW transaction for the current staff processing the payment
      // This ensures the omset goes to the current staff (userId)
      await createTransaction({
        branchId: effectiveBranchId,
        userId,
        items: selectedItemsList.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
        paymentMethod: method,
        paidAmount: totalSelected,
        status: 'paid',
      })

      // Cancel the original pending items so they don't appear in pending anymore
      // and won't double count stock (createTransaction already reduces stock)
      const itemsByTrx = new Map<string, string[]>()
      selectedItemsList.forEach(item => {
        const list = itemsByTrx.get(item.transaction_id) || []
        list.push(item.id)
        itemsByTrx.set(item.transaction_id, list)
      })

      for (const [trxId, itemIds] of itemsByTrx.entries()) {
        // Use each item's own branch_id for stock restoration
        const itemBranchId = selectedItemsList.find(i => i.transaction_id === trxId)?.branch_id ?? effectiveBranchId
        await cancelTransactionItems(trxId, itemIds, itemBranchId, userId)
      }

      toast.success('Pembayaran pending berhasil!')
      setSelectedItems(new Set())
      onRefresh()
      qc.invalidateQueries({ queryKey: ['today-stats'] })
    } catch (e: any) {
      toast.error(e.message || 'Gagal memproses pembayaran')
    }
  }

  const handleDebtPending = async () => {
    if (isReadOnly) {
      onLockedAction()
      return
    }
    if (selectedItemsList.length === 0) {
      toast.error('Pilih item yang ingin dijadikan hutang')
      return
    }
    if (!userId) {
      toast.error('Session tidak valid')
      return
    }

    // Use the item's own branch_id for the transaction (works across all branches)
    const effectiveBranchId = branchId || selectedItemsList[0].branch_id

    const customerName = prompt('Nama pelanggan:')
    if (!customerName || !customerName.trim()) {
      toast.error('Nama pelanggan wajib diisi')
      return
    }

    const customerPhone = prompt('Nomor HP (opsional):') || ''

    try {
      // Create a NEW transaction for the current staff processing the debt
      const trx = await createTransaction({
        branchId: effectiveBranchId,
        userId,
        items: selectedItemsList.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
        customerName,
        customerPhone,
        status: 'debt',
      })

      await createDebt({
        transaction_id: trx.id,
        branch_id: effectiveBranchId,
        customer_name: customerName,
        customer_phone: customerPhone,
        total_amount: totalSelected,
      })

      // Cancel the original pending items
      const itemsByTrx = new Map<string, string[]>()
      selectedItemsList.forEach(item => {
        const list = itemsByTrx.get(item.transaction_id) || []
        list.push(item.id)
        itemsByTrx.set(item.transaction_id, list)
      })

      for (const [trxId, itemIds] of itemsByTrx.entries()) {
        // Use each item's own branch_id for stock restoration
        const itemBranchId = selectedItemsList.find(i => i.transaction_id === trxId)?.branch_id ?? effectiveBranchId
        await cancelTransactionItems(trxId, itemIds, itemBranchId, userId)
      }

      toast.success('Hutang dari pending berhasil dicatat!')
      setSelectedItems(new Set())
      onRefresh()
      qc.invalidateQueries({ queryKey: ['debts'] })
    } catch (e: any) {
      toast.error(e.message || 'Gagal mencatat hutang')
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
        <Clock size={40} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">Tidak ada transaksi pending</p>
        <p className="text-xs mt-1 opacity-60">Item pending akan muncul di sini</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-amber-500" />
          <span className="text-sm font-bold text-amber-600">
            {items.length} item pending
          </span>
        </div>
        <button
          onClick={onRefresh}
          className="text-xs px-2 py-1 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors"
            style={{
              background: selectedItems.has(item.id) ? 'rgba(37,99,235,0.05)' : 'var(--bg-card)',
              border: `1px solid ${selectedItems.has(item.id) ? 'rgba(37,99,235,0.2)' : 'var(--border-color)'}`,
            }}
          >
            <button
              onClick={() => toggleItem(item.id)}
              style={{ color: selectedItems.has(item.id) ? 'var(--accent-primary)' : 'var(--text-muted)' }}
              className="flex-shrink-0"
            >
              {selectedItems.has(item.id) ? <CheckSquare size={18} /> : <Square size={18} />}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {item.product_name}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {item.code} • x{item.quantity}
                {!branchId && (
                  <>
                    {' • '}
                    <span className="text-blue-500">{item.branch_id}</span>
                  </>
                )}
              </p>
            </div>
            <span className="text-xs font-bold flex-shrink-0" style={{ color: 'var(--accent-primary)' }}>
              {formatCurrency(item.subtotal)}
            </span>
          </div>
        ))}
      </div>

      {selectedItems.size > 0 && (
        <div
          className="p-3 rounded-xl border"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex justify-between mb-2">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {selectedItems.size} item dipilih
            </span>
            <span className="text-base font-bold" style={{ color: 'var(--accent-primary)' }}>
              {formatCurrency(totalSelected)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="primary"
              className="text-xs py-2"
              onClick={() => handlePayPending('cash')}
            >
              <Banknote size={14} className="inline mr-1" />
              Bayar Cash
            </Button>
            <Button
              variant="danger"
              className="text-xs py-2"
              onClick={handleDebtPending}
            >
              HUTANG
            </Button>
            <Button
              variant="secondary"
              className="text-xs py-2"
              onClick={() => handlePayPending('qris')}
            >
              <QrCode size={14} className="inline mr-1" />
              Bayar QRIS
            </Button>
            <Button
              variant="secondary"
              className="text-xs py-2"
              onClick={() => handlePayPending('transfer')}
            >
              <CreditCard size={14} className="inline mr-1" />
              Transfer
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

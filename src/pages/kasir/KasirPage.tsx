import React, { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, Plus, Minus, ShoppingCart, CheckSquare, Square,
  CreditCard, Banknote, QrCode, User, X, Clock, AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { fetchProducts } from '@/services/productService'
import { fetchCategories } from '@/services/categoryService'
import {
  createTransaction,
  fetchPendingTransactions,
} from '@/services/transactionService'
import { createDebt } from '@/services/debtService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { statusBadge } from '@/components/ui/Badge'
import { formatCurrency, formatDateTime } from '@/utils/format'
import type { Product, PaymentMethod, Transaction } from '@/types'

export default function KasirPage() {
  const { user, selectedBranch } = useAuthStore()
  const cart = useCartStore()
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [payModal, setPayModal] = useState(false)
  const [debtModal, setDebtModal] = useState(false)
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash')
  const [paidAmount, setPaidAmount] = useState('')
  const [debtName, setDebtName] = useState('')
  const [debtPhone, setDebtPhone] = useState('')
  const [debtAddress, setDebtAddress] = useState('')

  const branchId = selectedBranch?.id ?? ''

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', branchId],
    queryFn: () => fetchProducts(branchId),
  })

  // Fetch pending transactions untuk cabang ini
  const { data: pendingTransactions = [], refetch: refetchPending } = useQuery({
    queryKey: ['pending-transactions', branchId],
    queryFn: () => fetchPendingTransactions(branchId),
    enabled: !!branchId,
  })

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
      const matchCat = activeCategory === 'all' || p.category_id === activeCategory
      return matchSearch && matchCat && p.is_active
    })
  }, [products, search, activeCategory])

  const selectedTotal = cart.getSelectedTotal()
  const paid = parseInt(paidAmount.replace(/\D/g, ''), 10) || 0
  const change = paid - selectedTotal
  const selectedCount = cart.getSelectedItems().length

  const payMutation = useMutation({
    mutationFn: async () => {
      if (!user || !branchId) throw new Error('Session tidak valid')
      const selectedItems = cart.getSelectedItems()
      if (selectedItems.length === 0) throw new Error('Pilih item yang ingin dibayar')
      
      const items = selectedItems.map((i) => ({
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
      toast.success('Transaksi berhasil! Pembayaran dicatat.')
      cart.removeSelectedItems()
      setPayModal(false)
      setPaidAmount('')
      setPayMethod('cash')
      qc.invalidateQueries({ queryKey: ['today-stats'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['pending-transactions'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const debtMutation = useMutation({
    mutationFn: async () => {
      if (!user || !branchId) throw new Error('Session tidak valid')
      if (!debtName.trim()) throw new Error('Nama pelanggan wajib diisi')
      
      const selectedItems = cart.getSelectedItems()
      if (selectedItems.length === 0) throw new Error('Pilih item yang ingin dicatat sebagai hutang')

      const items = selectedItems.map((i) => ({
        product_id: i.product.id,
        quantity: i.quantity,
        unit_price: i.unit_price,
      }))

      const totalAmount = selectedItems.reduce((s, i) => s + i.subtotal, 0)

      // 1. Buat transaksi status debt
      const trx = await createTransaction({
        branchId,
        userId: user.id,
        items,
        customerName: debtName,
        customerPhone: debtPhone,
        status: 'debt',
      })

      // 2. Buat record hutang
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
      cart.removeSelectedItems()
      setDebtModal(false)
      setDebtName('')
      setDebtPhone('')
      setDebtAddress('')
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['debts'] })
      qc.invalidateQueries({ queryKey: ['pending-transactions'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // Auto-add item to cart ketika diklik produk
  const handleAddProduct = (product: Product) => {
    // Stok sudah dikurangi otomatis saat createTransaction
    // Tapi kita perlu cek stok lokal untuk UX
    if (product.stock <= 0) {
      toast.error('Stok habis')
      return
    }
    cart.addItem(product, product.base_price)
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Left: Product grid */}
      <div className="flex-1 flex flex-col gap-4 min-h-0">
        {/* Search */}
        <Input
          placeholder="Cari produk..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search size={16} />}
        />

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveCategory('all')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === 'all' ? 'text-white' : 'opacity-60'
            }`}
            style={{
              background: activeCategory === 'all' ? 'var(--accent-primary)' : 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: activeCategory === 'all' ? 'white' : 'var(--text-primary)',
            }}
          >
            Semua
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={{
                background: activeCategory === cat.id ? 'var(--accent-primary)' : 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: activeCategory === cat.id ? 'white' : 'var(--text-primary)',
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Products grid */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <span className="loading-spinner" style={{ color: 'var(--accent-primary)', width: 32, height: 32 }} />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAdd={() => handleAddProduct(product)}
                />
              ))}
              {filteredProducts.length === 0 && (
                <div className="col-span-full text-center py-12" style={{ color: 'var(--text-muted)' }}>
                  Produk tidak ditemukan
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pending Transactions Banner */}
        {pendingTransactions.length > 0 && (
          <div
            className="p-3 rounded-xl border flex items-center gap-3"
            style={{ background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.2)' }}
          >
            <Clock size={20} className="text-amber-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-600">
                {pendingTransactions.length} Transaksi Pending
              </p>
              <p className="text-xs text-amber-500">
                Item masih menunggu pembayaran/hutang
              </p>
            </div>
            <button
              onClick={() => refetchPending()}
              className="text-xs px-3 py-1 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
            >
              Refresh
            </button>
          </div>
        )}
      </div>

      {/* Right: Cart */}
      <div
        className="w-full lg:w-80 flex flex-col gap-3 card p-4"
        style={{ minHeight: '400px' }}
      >
        <div className="flex items-center gap-2">
          <ShoppingCart size={18} style={{ color: 'var(--accent-primary)' }} />
          <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>
            Keranjang ({cart.getTotalItems()})
          </h3>
          {cart.items.length > 0 && (
            <button
              onClick={cart.clearCart}
              className="ml-auto text-xs text-red-500 hover:text-red-600"
            >
              Kosongkan
            </button>
          )}
        </div>

        {/* Select all */}
        {cart.items.length > 0 && (
          <div className="flex gap-2">
            <button onClick={cart.selectAll} className="btn btn-secondary text-xs py-1 flex-1">
              <CheckSquare size={14} /> Pilih Semua
            </button>
            <button onClick={cart.deselectAll} className="btn btn-secondary text-xs py-1 flex-1">
              <Square size={14} /> Hapus Pilihan
            </button>
          </div>
        )}

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {cart.items.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
              <ShoppingCart size={40} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Keranjang kosong</p>
              <p className="text-xs mt-1 opacity-60">
                Klik produk untuk menambahkan
              </p>
            </div>
          ) : (
            cart.items.map((item) => (
              <CartItemRow
                key={item.product.id}
                item={item}
                onToggle={() => cart.toggleSelect(item.product.id)}
                onInc={() => cart.updateQty(item.product.id, item.quantity + 1)}
                onDec={() => cart.updateQty(item.product.id, item.quantity - 1)}
                onRemove={() => cart.removeItem(item.product.id)}
              />
            ))
          )}
        </div>

        {/* Total & Actions */}
        <div
          className="pt-3 space-y-2"
          style={{ borderTop: '1px solid var(--border-color)' }}
        >
          {/* Info */}
          {cart.items.length > 0 && (
            <div className="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
              <div className="flex justify-between">
                <span>Total Item:</span>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{cart.getTotalItems()}</span>
              </div>
              <div className="flex justify-between">
                <span>Dipilih:</span>
                <span className="font-medium" style={{ color: 'var(--accent-primary)' }}>{selectedCount} item</span>
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
              Total Terpilih
            </span>
            <span className="text-lg font-bold" style={{ color: 'var(--accent-primary)' }}>
              {formatCurrency(selectedTotal)}
            </span>
          </div>

          {selectedCount === 0 && cart.items.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-amber-600">
              <AlertCircle size={12} />
              <span>Ceklis item yang akan diproses</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="warning"
              onClick={() => setDebtModal(true)}
              disabled={selectedCount === 0}
              className="text-xs"
            >
              Hutang
            </Button>
            <Button
              variant="primary"
              onClick={() => setPayModal(true)}
              disabled={selectedCount === 0}
              icon={<CreditCard size={16} />}
              className="text-xs"
            >
              Bayar
            </Button>
          </div>
        </div>
      </div>

      {/* Pay Modal */}
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
              disabled={payMethod === 'cash' && paid < selectedTotal}
            >
              Konfirmasi Bayar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Items selected */}
          <div className="p-3 rounded-xl" style={{ background: 'var(--bg-primary)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Item yang akan dibayar ({selectedCount}):
            </p>
            {cart.getSelectedItems().map((item) => (
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
              <span style={{ color: 'var(--accent-primary)' }}>{formatCurrency(selectedTotal)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <p className="label">Metode Pembayaran</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'cash' as const, label: 'Cash', icon: <Banknote size={20} /> },
                { key: 'qris' as const, label: 'QRIS', icon: <QrCode size={20} /> },
                { key: 'transfer' as const, label: 'Transfer', icon: <CreditCard size={20} /> },
              ]).map((m) => (
                <button
                  key={m.key}
                  onClick={() => setPayMethod(m.key)}
                  className="p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all"
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
              {paid >= selectedTotal && (
                <div className="flex justify-between p-3 rounded-xl" style={{ background: 'var(--bg-primary)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Kembalian</span>
                  <span className="font-bold text-green-500">{formatCurrency(change)}</span>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>

      {/* Debt Modal */}
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
          {/* Items summary */}
          <div className="p-3 rounded-xl" style={{ background: 'var(--bg-primary)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Item hutang ({selectedCount}):
            </p>
            {cart.getSelectedItems().map((item) => (
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
              <span className="text-red-500">{formatCurrency(selectedTotal)}</span>
            </div>
          </div>

          {/* Customer Info */}
          <Input
            label="Nama Pelanggan *"
            value={debtName}
            onChange={(e) => setDebtName(e.target.value)}
            placeholder="Masukkan nama pelanggan"
            leftIcon={<User size={16} />}
          />
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
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Hutang ini bisa dilihat dan dibayar oleh semua staf di semua cabang.
          </p>
        </div>
      </Modal>
    </div>
  )
}

// Product Card
const ProductCard: React.FC<{ product: Product; onAdd: () => void }> = ({ product, onAdd }) => (
  <button
    onClick={onAdd}
    disabled={product.stock <= 0}
    className="pos-product-card text-left relative"
  >
    {product.stock <= product.min_stock && product.stock > 0 && (
      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500" title="Stok menipis" />
    )}
    {product.stock <= 0 && (
      <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black bg-opacity-40 text-white text-xs font-bold">
        HABIS
      </span>
    )}
    <div
      className="w-full aspect-square rounded-xl flex items-center justify-center text-2xl"
      style={{ background: 'var(--bg-primary)' }}
    >
      🛍️
    </div>
    <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
      {product.name}
    </p>
    <p className="text-xs font-bold" style={{ color: 'var(--accent-primary)' }}>
      {formatCurrency(product.base_price)}
    </p>
    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
      Stok: {product.stock}
    </p>
  </button>
)

// Cart Item Row
interface CartItemRowProps {
  item: ReturnType<typeof useCartStore.getState>['items'][0]
  onToggle: () => void
  onInc: () => void
  onDec: () => void
  onRemove: () => void
}

const CartItemRow: React.FC<CartItemRowProps> = ({ item, onToggle, onInc, onDec, onRemove }) => (
  <div
    className="flex items-center gap-2 p-2 rounded-xl transition-colors"
    style={{
      background: item.selected ? 'rgba(37,99,235,0.05)' : 'var(--bg-primary)',
      border: `1px solid ${item.selected ? 'rgba(37,99,235,0.2)' : 'var(--border-color)'}`,
    }}
  >
    <button onClick={onToggle} style={{ color: item.selected ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
      {item.selected ? <CheckSquare size={18} /> : <Square size={18} />}
    </button>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
        {item.product.name}
      </p>
      <p className="text-xs" style={{ color: 'var(--accent-primary)' }}>
        {formatCurrency(item.subtotal)}
      </p>
    </div>
    <div className="flex items-center gap-1">
      <button
        onClick={onDec}
        className="w-6 h-6 rounded-lg flex items-center justify-center"
        style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
      >
        <Minus size={12} />
      </button>
      <span className="w-6 text-center text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
        {item.quantity}
      </span>
      <button
        onClick={onInc}
        className="w-6 h-6 rounded-lg flex items-center justify-center"
        style={{ background: 'var(--accent-primary)', color: 'white' }}
      >
        <Plus size={12} />
      </button>
    </div>
    <button onClick={onRemove} className="text-red-400 hover:text-red-500 p-0.5">
      <X size={14} />
    </button>
  </div>
)

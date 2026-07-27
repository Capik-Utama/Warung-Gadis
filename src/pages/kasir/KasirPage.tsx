import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, Plus, Minus, Trash2, ShoppingCart, CheckSquare, Square,
  CreditCard, Banknote, QrCode, User, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { fetchProducts } from '@/services/productService'
import { fetchCategories } from '@/services/categoryService'
import { createTransaction, markTransactionAsDebt } from '@/services/transactionService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency } from '@/utils/format'
import type { Product, PaymentMethod } from '@/types'

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

  const branchId = selectedBranch?.id ?? ''

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', branchId],
    queryFn: () => fetchProducts(branchId),
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

  const payMutation = useMutation({
    mutationFn: async () => {
      if (!user || !branchId) throw new Error('Session tidak valid')
      const items = cart.items.map((i) => ({
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
      toast.success('Transaksi berhasil!')
      cart.clearCart()
      setPayModal(false)
      setPaidAmount('')
      qc.invalidateQueries({ queryKey: ['today-stats'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const debtMutation = useMutation({
    mutationFn: async () => {
      if (!user || !branchId) throw new Error('Session tidak valid')
      if (!debtName.trim()) throw new Error('Nama pelanggan wajib diisi')
      const items = cart.items.map((i) => ({
        product_id: i.product.id,
        quantity: i.quantity,
        unit_price: i.unit_price,
      }))
      await createTransaction({
        branchId,
        userId: user.id,
        items,
        customerName: debtName,
        customerPhone: debtPhone,
        status: 'debt',
      })
    },
    onSuccess: () => {
      toast.success('Hutang berhasil dicatat!')
      cart.clearCart()
      setDebtModal(false)
      setDebtName('')
      setDebtPhone('')
    },
    onError: (e: Error) => toast.error(e.message),
  })

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
                  onAdd={() => cart.addItem(product, product.base_price)}
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

        {/* Total */}
        <div
          className="pt-3"
          style={{ borderTop: '1px solid var(--border-color)' }}
        >
          <div className="flex justify-between mb-3">
            <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
              Total Terpilih
            </span>
            <span className="text-lg font-bold" style={{ color: 'var(--accent-primary)' }}>
              {formatCurrency(selectedTotal)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              onClick={() => setDebtModal(true)}
              disabled={cart.items.length === 0}
              className="text-xs"
            >
              Hutang
            </Button>
            <Button
              variant="primary"
              onClick={() => setPayModal(true)}
              disabled={cart.getSelectedItems().length === 0}
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
              variant="primary"
              loading={payMutation.isPending}
              onClick={() => payMutation.mutate()}
              disabled={payMethod === 'cash' && paid < selectedTotal}
            >
              Konfirmasi
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="label">Total Pembayaran</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--accent-primary)' }}>
              {formatCurrency(selectedTotal)}
            </p>
          </div>

          <div>
            <p className="label">Metode Pembayaran</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'cash', label: 'Tunai', icon: <Banknote size={20} /> },
                { key: 'qris', label: 'QRIS', icon: <QrCode size={20} /> },
                { key: 'transfer', label: 'Transfer', icon: <CreditCard size={20} /> },
              ] as const).map((m) => (
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
            >
              Jadikan Hutang
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex justify-between p-3 rounded-xl" style={{ background: 'var(--bg-primary)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Total Hutang</span>
            <span className="font-bold text-red-500">{formatCurrency(cart.items.reduce((s, i) => s + i.subtotal, 0))}</span>
          </div>
          <Input
            label="Nama Pelanggan *"
            value={debtName}
            onChange={(e) => setDebtName(e.target.value)}
            placeholder="Nama pelanggan"
            leftIcon={<User size={16} />}
          />
          <Input
            label="Nomor HP (Opsional)"
            value={debtPhone}
            onChange={(e) => setDebtPhone(e.target.value)}
            placeholder="08xxxxxxxxxx"
          />
        </div>
      </Modal>
    </div>
  )
}

// Product Card
const ProductCard: React.FC<{ product: Product; onAdd: () => void }> = ({ product, onAdd }) => (
  <button
    onClick={onAdd}
    disabled={product.stock === 0}
    className="pos-product-card text-left relative"
  >
    {product.stock <= product.min_stock && product.stock > 0 && (
      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500" title="Stok menipis" />
    )}
    {product.stock === 0 && (
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

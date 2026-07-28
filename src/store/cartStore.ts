import { create } from 'zustand'
import type { CartItem, Product } from '@/types'

interface CartStore {
  items: CartItem[]
  customerName: string
  customerPhone: string
  notes: string
  addItem: (product: Product, price: number) => void
  removeItem: (productId: string) => void
  setQty: (productId: string, qty: number) => void
  updateQty: (productId: string, qty: number) => void
  toggleCheckbox: (productId: string, product: Product, price: number) => void
  selectAll: () => void
  deselectAll: () => void
  setCustomer: (name: string, phone: string) => void
  setNotes: (notes: string) => void
  clearCart: () => void
  removeSelectedItems: () => void
  getSelectedItems: () => CartItem[]
  getSelectedTotal: () => number
  getTotalItems: () => number
  getCheckedItems: () => CartItem[]
  getCheckedTotal: () => number
  getCheckedCount: () => number
  isChecked: (productId: string) => boolean
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  customerName: '',
  customerPhone: '',
  notes: '',

  addItem: (product, price) => {
    const existing = get().items.find((i) => i.product.id === product.id)
    if (existing) {
      set((s) => ({
        items: s.items.map((i) =>
          i.product.id === product.id
            ? {
                ...i,
                quantity: i.quantity + 1,
                subtotal: (i.quantity + 1) * i.unit_price,
              }
            : i,
        ),
      }))
    } else {
      set((s) => ({
        items: [
          ...s.items,
          {
            product,
            quantity: 1,
            unit_price: price,
            subtotal: price,
            selected: true,
            checked: false,
          },
        ],
      }))
    }
  },

  removeItem: (productId) =>
    set((s) => ({ items: s.items.filter((i) => i.product.id !== productId) })),

  setQty: (productId, qty) => {
    if (qty <= 0) {
      get().removeItem(productId)
      return
    }
    set((s) => ({
      items: s.items.map((i) =>
        i.product.id === productId
          ? { ...i, quantity: qty, subtotal: qty * i.unit_price }
          : i,
      ),
    }))
  },

  updateQty: (productId, qty) => {
    if (qty <= 0) {
      get().removeItem(productId)
      return
    }
    set((s) => ({
      items: s.items.map((i) =>
        i.product.id === productId
          ? { ...i, quantity: qty, subtotal: qty * i.unit_price }
          : i,
      ),
    }))
  },

  // Ceklis produk: jika belum ada di cart, tambah dulu lalu centang
  toggleCheckbox: (productId, product, price) => {
    const state = get()
    const existing = state.items.find((i) => i.product.id === productId)
    if (!existing) {
      // Produk belum ada di cart, tambahkan dengan checked=true
      set((s) => ({
        items: [
          ...s.items,
          {
            product,
            quantity: 1,
            unit_price: price,
            subtotal: price,
            selected: true,
            checked: true,
          },
        ],
      }))
    } else {
      // Produk sudah ada, toggle checked
      set((s) => ({
        items: s.items.map((i) =>
          i.product.id === productId ? { ...i, checked: !i.checked } : i,
        ),
      }))
    }
  },

  toggleSelect: (productId: string) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.product.id === productId ? { ...i, selected: !i.selected } : i,
      ),
    })),

  selectAll: () =>
    set((s) => ({ items: s.items.map((i) => ({ ...i, checked: true, selected: true })) })),

  deselectAll: () =>
    set((s) => ({ items: s.items.map((i) => ({ ...i, checked: false, selected: false })) })),

  setCustomer: (name, phone) => set({ customerName: name, customerPhone: phone }),
  setNotes: (notes) => set({ notes }),
  clearCart: () =>
    set({ items: [], customerName: '', customerPhone: '', notes: '' }),

  removeSelectedItems: () =>
    set((s) => ({ items: s.items.filter((i) => !i.checked) })),

  getSelectedItems: () => get().getCheckedItems(),

  getCheckedItems: () => get().items.filter((i) => i.checked),

  getSelectedTotal: () => get().getCheckedTotal(),

  getCheckedTotal: () =>
    get()
      .items.filter((i) => i.checked)
      .reduce((sum, i) => sum + i.subtotal, 0),

  getCheckedCount: () => get().items.filter((i) => i.checked).length,

  getTotalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

  isChecked: (productId: string) => {
    const item = get().items.find((i) => i.product.id === productId)
    return item?.checked ?? false
  },
}))

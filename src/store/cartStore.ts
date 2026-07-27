import { create } from 'zustand'
import type { CartItem, Product } from '@/types'

interface CartStore {
  items: CartItem[]
  customerName: string
  customerPhone: string
  notes: string
  addItem: (product: Product, price: number) => void
  removeItem: (productId: string) => void
  updateQty: (productId: string, qty: number) => void
  toggleSelect: (productId: string) => void
  selectAll: () => void
  deselectAll: () => void
  setCustomer: (name: string, phone: string) => void
  setNotes: (notes: string) => void
  clearCart: () => void
  getSelectedItems: () => CartItem[]
  getSelectedTotal: () => number
  getTotalItems: () => number
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
          },
        ],
      }))
    }
  },

  removeItem: (productId) =>
    set((s) => ({ items: s.items.filter((i) => i.product.id !== productId) })),

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

  toggleSelect: (productId) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.product.id === productId ? { ...i, selected: !i.selected } : i,
      ),
    })),

  selectAll: () =>
    set((s) => ({ items: s.items.map((i) => ({ ...i, selected: true })) })),

  deselectAll: () =>
    set((s) => ({ items: s.items.map((i) => ({ ...i, selected: false })) })),

  setCustomer: (name, phone) => set({ customerName: name, customerPhone: phone }),
  setNotes: (notes) => set({ notes }),
  clearCart: () =>
    set({ items: [], customerName: '', customerPhone: '', notes: '' }),

  getSelectedItems: () => get().items.filter((i) => i.selected),

  getSelectedTotal: () =>
    get()
      .items.filter((i) => i.selected)
      .reduce((sum, i) => sum + i.subtotal, 0),

  getTotalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}))

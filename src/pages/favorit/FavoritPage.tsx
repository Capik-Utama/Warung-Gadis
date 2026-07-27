import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Heart, ShoppingCart } from 'lucide-react'
import { fetchProducts } from '@/services/productService'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency } from '@/utils/format'
import type { Product } from '@/types'
import toast from 'react-hot-toast'

const STORAGE_KEY = 'wg-favorites'

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

export default function FavoritPage() {
  const { user, selectedBranch } = useAuthStore()
  const { addItem } = useCartStore()
  const branchId = selectedBranch?.id ?? ''
  const { favorites, toggle } = useFavorites(user?.id ?? '')

  const { data: products = [] } = useQuery({ queryKey: ['products', branchId], queryFn: () => fetchProducts(branchId) })
  const favProducts = products.filter((p: Product) => favorites.includes(p.id))
  const nonFavProducts = products.filter((p: Product) => !favorites.includes(p.id) && p.is_active)

  return (
    <div className="space-y-5">
      <div><h1 className="page-title">Favorit</h1><p className="page-subtitle">Produk favorit Anda</p></div>
      {favProducts.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><Heart size={16} className="text-red-500" />Produk Favorit</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {favProducts.map((p: Product) => <FavCard key={p.id} product={p} isFav={true} onToggle={() => toggle(p.id)} onAdd={() => { addItem(p, p.base_price); toast.success('Ditambah ke keranjang') }} />)}
          </div>
        </div>
      )}
      <div>
        <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Semua Produk</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {nonFavProducts.map((p: Product) => <FavCard key={p.id} product={p} isFav={false} onToggle={() => toggle(p.id)} onAdd={() => { addItem(p, p.base_price); toast.success('Ditambah ke keranjang') }} />)}
        </div>
        {nonFavProducts.length === 0 && favProducts.length === 0 && (
          <p className="text-center py-10" style={{ color: 'var(--text-muted)' }}>Belum ada produk</p>
        )}
      </div>
    </div>
  )
}

const FavCard: React.FC<{ product: Product; isFav: boolean; onToggle: () => void; onAdd: () => void }> = ({ product, isFav, onToggle, onAdd }) => (
  <div className="card p-3 space-y-2 relative">
    <button onClick={onToggle} className="absolute top-2 right-2 z-10"><Heart size={16} className={isFav ? 'text-red-500 fill-red-500' : 'text-gray-300'} /></button>
    <div className="w-full aspect-square rounded-xl flex items-center justify-center text-2xl" style={{ background: 'var(--bg-primary)' }}>&#128717;</div>
    <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{product.name}</p>
    <p className="text-xs font-bold" style={{ color: 'var(--accent-primary)' }}>{formatCurrency(product.base_price)}</p>
    <button onClick={onAdd} className="w-full btn btn-primary text-xs py-1.5"><ShoppingCart size={13} />Tambah</button>
  </div>
)

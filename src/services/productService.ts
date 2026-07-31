import { supabase } from '@/config/supabase'
import type { Product, ProductPrice, ProductStock, ProductWithBranchStocks } from '@/types'
import { ensurePermission } from './accessGuardService'

/**
 * Ambil produk. Bila branchId diberikan, harga & stok yang dikembalikan
 * adalah harga/stok cabang tersebut (stok disimpan di tabel product_stocks).
 */
export async function fetchProducts(branchId?: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(id,name,icon)')
    .order('name')
  if (error) throw error

  const products = (data ?? []) as Product[]

  if (!branchId) return products

  const [{ data: prices }, { data: stocks }] = await Promise.all([
    supabase.from('product_prices').select('*').eq('branch_id', branchId),
    supabase.from('product_stocks').select('*').eq('branch_id', branchId),
  ])

  const priceMap = new Map((prices ?? []).map((p: ProductPrice) => [p.product_id, p.price]))
  const stockMap = new Map((stocks ?? []).map((s: ProductStock) => [s.product_id, s]))

  return products.map((p) => {
    const s = stockMap.get(p.id)
    return {
      ...p,
      base_price: priceMap.get(p.id) ?? p.base_price,
      stock: s?.stock ?? 0,
      min_stock: s?.min_stock ?? p.min_stock,
    }
  })
}

/**
 * Ambil produk lengkap dengan stok tiap cabang + total.
 * Dipakai halaman Produk untuk tampilan slide Total | Cabang 1 | Cabang 2 ...
 */
export async function fetchProductsAllBranches(): Promise<ProductWithBranchStocks[]> {
  const [{ data, error }, { data: stocks }] = await Promise.all([
    supabase.from('products').select('*, category:categories(id,name,icon)').order('name'),
    supabase.from('product_stocks').select('*'),
  ])
  if (error) throw error

  const byProduct = new Map<string, Record<string, ProductStock>>()
  ;((stocks ?? []) as ProductStock[]).forEach((s) => {
    const entry = byProduct.get(s.product_id) ?? {}
    entry[s.branch_id] = s
    byProduct.set(s.product_id, entry)
  })

  return ((data ?? []) as Product[]).map((p) => {
    const perBranch = byProduct.get(p.id) ?? {}
    const stocks_by_branch: Record<string, number> = {}
    const min_stock_by_branch: Record<string, number> = {}
    let total = 0
    Object.entries(perBranch).forEach(([branchId, s]) => {
      stocks_by_branch[branchId] = s.stock
      min_stock_by_branch[branchId] = s.min_stock
      total += s.stock
    })
    return { ...p, stocks_by_branch, min_stock_by_branch, total_stock: total }
  })
}

export async function fetchProductStocks(productId: string): Promise<ProductStock[]> {
  const { data, error } = await supabase
    .from('product_stocks')
    .select('*')
    .eq('product_id', productId)
  if (error) throw error
  return (data ?? []) as ProductStock[]
}

export async function createProduct(
  payload: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'category'> & {
    branch_id?: string
    branch_stocks?: Record<string, number>
  },
): Promise<Product> {
  await ensurePermission('add_product')

  const { branch_id, branch_stocks, stock, ...rest } = payload

  // products.stock tidak lagi jadi sumber kebenaran; stok masuk ke product_stocks
  const { data, error } = await supabase
    .from('products')
    .insert({ ...rest, stock: 0 })
    .select()
    .single()
  if (error) throw error

  const product = data as Product

  // Trigger DB sudah membuat baris stok untuk semua cabang aktif.
  // Di sini kita isi nilai awalnya.
  const initial: Record<string, number> = { ...(branch_stocks ?? {}) }
  if (branch_id && initial[branch_id] === undefined && stock) {
    initial[branch_id] = stock
  }

  await Promise.all(
    Object.entries(initial).map(([bId, value]) =>
      supabase.rpc('set_branch_stock', {
        p_product_id: product.id,
        p_branch_id: bId,
        p_stock: value ?? 0,
      }),
    ),
  )

  return product
}

export async function updateProduct(
  id: string,
  payload: Partial<Product> & { branch_stocks?: Record<string, number> },
): Promise<Product> {
  await ensurePermission('edit_product')

  const { branch_stocks, stock: _stock, ...productPayload } = payload

  const { data, error } = await supabase
    .from('products')
    .update(productPayload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error

  if (branch_stocks) {
    await Promise.all(
      Object.entries(branch_stocks).map(([bId, value]) =>
        supabase.rpc('set_branch_stock', {
          p_product_id: id,
          p_branch_id: bId,
          p_stock: value ?? 0,
        }),
      ),
    )
  }

  return data as Product
}

export async function deleteProduct(id: string): Promise<void> {
  await ensurePermission('delete_product')
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

export async function setBranchPrice(
  productId: string,
  branchId: string,
  price: number,
): Promise<void> {
  await ensurePermission('edit_price')
  const { error } = await supabase
    .from('product_prices')
    .upsert({ product_id: productId, branch_id: branchId, price }, { onConflict: 'product_id,branch_id' })
  if (error) throw error
}

export async function setBranchMinStock(
  productId: string,
  branchId: string,
  minStock: number,
): Promise<void> {
  await ensurePermission('edit_product')
  const { error } = await supabase
    .from('product_stocks')
    .upsert(
      { product_id: productId, branch_id: branchId, min_stock: minStock },
      { onConflict: 'product_id,branch_id' },
    )
  if (error) throw error
}

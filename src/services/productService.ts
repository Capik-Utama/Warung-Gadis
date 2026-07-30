import { supabase } from '@/config/supabase'
import type { Product, ProductPrice } from '@/types'
import { ensurePermission } from './accessGuardService'

export async function fetchProducts(branchId?: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(id,name,icon)')
    .order('name')
  if (error) throw error

  if (branchId) {
    const { data: prices } = await supabase
      .from('product_prices')
      .select('*')
      .eq('branch_id', branchId)

    const priceMap = new Map((prices ?? []).map((p: ProductPrice) => [p.product_id, p.price]))

    return (data as Product[]).map((p) => ({
      ...p,
      base_price: priceMap.get(p.id) ?? p.base_price,
    }))
  }

  return data as Product[]
}

export async function createProduct(
  payload: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'category'> & { branch_id?: string },
): Promise<Product> {
  await ensurePermission('add_product')
  
  // Remove branch_id from payload as it's not part of products table
  const { branch_id: _, ...productPayload } = payload
  
  const { data, error } = await supabase
    .from('products')
    .insert(productPayload)
    .select()
    .single()
  if (error) throw error
  return data as Product
}

export async function updateProduct(id: string, payload: Partial<Product>): Promise<Product> {
  await ensurePermission('edit_product')
  const { data, error } = await supabase
    .from('products')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
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

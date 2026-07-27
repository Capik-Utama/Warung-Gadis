import { supabase } from '@/config/supabase'
import type { Supplier } from '@/types'

export async function fetchSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('name')
  if (error) throw error
  return data as Supplier[]
}

export async function createSupplier(
  payload: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>,
): Promise<Supplier> {
  const { data, error } = await supabase
    .from('suppliers')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data as Supplier
}

export async function updateSupplier(id: string, payload: Partial<Supplier>): Promise<Supplier> {
  const { data, error } = await supabase
    .from('suppliers')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Supplier
}

export async function deleteSupplier(id: string): Promise<void> {
  const { error } = await supabase.from('suppliers').delete().eq('id', id)
  if (error) throw error
}

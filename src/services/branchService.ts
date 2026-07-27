import { supabase } from '@/config/supabase'
import type { Branch } from '@/types'

export async function fetchBranches(): Promise<Branch[]> {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .order('name')
  if (error) throw error
  return data as Branch[]
}

export async function createBranch(payload: Omit<Branch, 'id' | 'created_at' | 'updated_at'>): Promise<Branch> {
  const { data, error } = await supabase
    .from('branches')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data as Branch
}

export async function updateBranch(id: string, payload: Partial<Branch>): Promise<Branch> {
  const { data, error } = await supabase
    .from('branches')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Branch
}

export async function deleteBranch(id: string): Promise<void> {
  const { error } = await supabase.from('branches').delete().eq('id', id)
  if (error) throw error
}

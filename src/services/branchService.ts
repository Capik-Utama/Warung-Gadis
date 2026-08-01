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

export async function fetchOperationalBranches(): Promise<Branch[]> {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('is_operational', true)
    .order('name')
  if (error) throw error
  return data as Branch[]
}

export async function setBranchOperational(branchId: string, isOperational: boolean): Promise<void> {
  const { error } = await supabase
    .from('branches')
    .update({ is_operational: isOperational })
    .eq('id', branchId)
  if (error) throw error
}

export async function isBranchOperational(branchId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('branches')
    .select('is_operational')
    .eq('id', branchId)
    .single()
  if (error) throw error
  return data.is_operational
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

import { supabase } from '@/config/supabase'
import type { User, UserRole, PermissionKey, UserBranch } from '@/types'
import { ROLE_DEFAULT_PERMISSIONS } from '@/permissions'

export interface LoginCredentials {
  name: string
  password: string
}

export async function loginUser(
  credentials: LoginCredentials,
): Promise<{ user: User; permissions: PermissionKey[] }> {
  const hash = await hashPassword(credentials.password)

  const { data, error } = await supabase
    .from('users')
    .select('id, name, phone, address, role, branch_id, avatar_url, is_active, created_at, updated_at')
    .ilike('name', credentials.name.trim())
    .eq('password_hash', hash)
    .eq('is_active', true)
    .single()

  if (error || !data) throw new Error('Nama atau password salah')

  const user = data as User

  // Fetch extra user permissions
  const { data: permData } = await supabase
    .from('user_permissions')
    .select('permission_key')
    .eq('user_id', user.id)

  const extraPerms = (permData ?? []).map((p: { permission_key: string }) => p.permission_key as PermissionKey)
  const defaultPerms = ROLE_DEFAULT_PERMISSIONS[user.role as UserRole] ?? []
  const allPerms = Array.from(new Set([...defaultPerms, ...extraPerms]))

  return { user, permissions: allPerms }
}

export async function fetchUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, phone, address, role, branch_id, avatar_url, is_active, created_at, updated_at')
    .order('name')
  if (error) throw error
  return data as User[]
}

export async function createUser(
  payload: Omit<User, 'id' | 'created_at' | 'updated_at'> & { password: string },
): Promise<User> {
  const { password, ...rest } = payload
  const hash = await hashPassword(password)
  const { data, error } = await supabase
    .from('users')
    .insert({ ...rest, password_hash: hash })
    .select()
    .single()
  if (error) throw error
  return data as User
}

export async function updateUser(id: string, payload: Partial<User> & { password?: string }): Promise<User> {
  const updates: Record<string, unknown> = { ...payload }
  if (payload.password) {
    updates.password_hash = await hashPassword(payload.password)
    delete updates.password
  }
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as User
}

export async function deleteUser(id: string): Promise<void> {
  const { error } = await supabase.from('users').delete().eq('id', id)
  if (error) throw error
}

export async function getUserPermissions(userId: string): Promise<PermissionKey[]> {
  const { data, error } = await supabase
    .from('user_permissions')
    .select('permission_key')
    .eq('user_id', userId)
  if (error) throw error
  return (data ?? []).map((p: { permission_key: string }) => p.permission_key as PermissionKey)
}

export async function saveUserPermissions(
  userId: string,
  permissions: PermissionKey[],
): Promise<void> {
  await supabase.from('user_permissions').delete().eq('user_id', userId)
  if (permissions.length > 0) {
    const rows = permissions.map((key) => ({ user_id: userId, permission_key: key }))
    const { error } = await supabase.from('user_permissions').insert(rows)
    if (error) throw error
  }
}

// ─── User Branch Access ─────────────────────────────────────

export async function fetchUserBranches(userId: string): Promise<UserBranch[]> {
  const { data, error } = await supabase
    .from('user_branches')
    .select('id, user_id, branch_id, created_at')
    .eq('user_id', userId)
  if (error) throw error
  return data as UserBranch[]
}

export async function saveUserBranches(
  userId: string,
  branchIds: string[],
): Promise<void> {
  await supabase.from('user_branches').delete().eq('user_id', userId)
  if (branchIds.length > 0) {
    const rows = branchIds.map((bid) => ({ user_id: userId, branch_id: bid }))
    const { error } = await supabase.from('user_branches').insert(rows)
    if (error) throw error
  }
}

export async function isUserAllowedAtBranch(
  userId: string,
  branchId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_branches')
    .select('id')
    .eq('user_id', userId)
    .eq('branch_id', branchId)
    .maybeSingle()
  if (error) return false
  return !!data
}

/**
 * Hash a password using SHA-256 via the Web Crypto API.
 * NOTE: For production deployments, use bcrypt via a Supabase Edge Function
 * or consider migrating to Supabase Auth for proper password management.
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

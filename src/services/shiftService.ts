import { supabase } from '@/config/supabase'
import type { Shift, ShiftHandover } from '@/types'

export async function checkInShift(userId: string, branchId: string): Promise<Shift> {
  const { data, error } = await supabase
    .from('shifts')
    .insert({
      user_id: userId,
      branch_id: branchId,
      check_in: new Date().toISOString(),
      status: 'active',
      system_cash: 0,
    })
    .select()
    .single()
  if (error) throw error
  return data as Shift
}

export async function getActiveShift(userId: string): Promise<Shift | null> {
  const { data } = await supabase
    .from('shifts')
    .select('*, user:users(id,name), branch:branches(id,name)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  return data as Shift | null
}

export async function getAllActiveShifts(branchId: string): Promise<Shift[]> {
  const { data, error } = await supabase
    .from('shifts')
    .select('*, user:users(id,name)')
    .eq('branch_id', branchId)
    .eq('status', 'active')
    .order('created_at')
  if (error) throw error
  return data as Shift[]
}

export async function requestHandover(payload: {
  fromShiftId: string
  fromUserId: string
  toUserId: string
  branchId: string
  systemCash: number
  actualCash: number
  notes: string
}): Promise<ShiftHandover> {
  const difference = payload.actualCash - payload.systemCash
  const { data, error } = await supabase
    .from('shift_handovers')
    .insert({
      from_shift_id: payload.fromShiftId,
      from_user_id: payload.fromUserId,
      to_user_id: payload.toUserId,
      branch_id: payload.branchId,
      system_cash: payload.systemCash,
      actual_cash: payload.actualCash,
      difference,
      notes: payload.notes,
      status: 'pending',
    })
    .select()
    .single()
  if (error) throw error

  // Mark from-shift as pending_handover
  await supabase
    .from('shifts')
    .update({ status: 'pending_handover' })
    .eq('id', payload.fromShiftId)

  return data as ShiftHandover
}

export async function approveHandover(handoverId: string, fromShiftId: string): Promise<void> {
  // Approve handover
  const { error } = await supabase
    .from('shift_handovers')
    .update({ status: 'approved' })
    .eq('id', handoverId)
  if (error) throw error

  // Close the from-shift
  await supabase
    .from('shifts')
    .update({ status: 'closed', check_out: new Date().toISOString() })
    .eq('id', fromShiftId)
}

export async function getPendingHandover(toUserId: string): Promise<ShiftHandover | null> {
  const { data } = await supabase
    .from('shift_handovers')
    .select('*, from_user:users!shift_handovers_from_user_id_fkey(id,name)')
    .eq('to_user_id', toUserId)
    .eq('status', 'pending')
    .maybeSingle()
  return data as ShiftHandover | null
}

export async function fetchShiftHistory(branchId: string): Promise<Shift[]> {
  const { data, error } = await supabase
    .from('shifts')
    .select('*, user:users(id,name)')
    .eq('branch_id', branchId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data as Shift[]
}

export async function autoHandover(payload: {
  fromShiftId: string
  fromUserId: string
  toUserId: string
  branchId: string
  systemCash: number
  actualCash: number
  notes: string
}): Promise<ShiftHandover> {
  const difference = payload.actualCash - payload.systemCash

  // Insert handover record with status 'approved' directly
  const { data, error } = await supabase
    .from('shift_handovers')
    .insert({
      from_shift_id: payload.fromShiftId,
      from_user_id: payload.fromUserId,
      to_user_id: payload.toUserId,
      branch_id: payload.branchId,
      system_cash: payload.systemCash,
      actual_cash: payload.actualCash,
      difference,
      notes: payload.notes,
      status: 'approved',
    })
    .select()
    .single()
  if (error) throw error

  // Close the from-shift immediately
  await supabase
    .from('shifts')
    .update({ status: 'closed', check_out: new Date().toISOString() })
    .eq('id', payload.fromShiftId)

  return data as ShiftHandover
}

export async function closeAllShifts(branchId: string): Promise<void> {
  const { error } = await supabase
    .from('shifts')
    .update({ status: 'closed', check_out: new Date().toISOString() })
    .eq('branch_id', branchId)
    .neq('status', 'closed')
  if (error) throw error
}

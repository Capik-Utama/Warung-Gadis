import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Search, Shield, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchUsers, createUser, updateUser, deleteUser, getUserPermissions, saveUserPermissions } from '@/services/userService'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { roleBadge, statusBadge } from '@/components/ui/Badge'
import { useAuthStore } from '@/store/authStore'
import { ALL_PERMISSIONS, ROLE_DEFAULT_PERMISSIONS } from '@/permissions'
import type { User, PermissionKey, UserRole } from '@/types'

interface UserForm {
  name: string
  address: string
  phone: string
  role: UserRole
  password: string
  is_active: boolean
  branch_id: string | null
  avatar_url: string | null
  permissions: PermissionKey[]
}

const defaultForm: UserForm = {
  name: '',
  address: '',
  phone: '',
  role: 'staff',
  password: '',
  is_active: true,
  branch_id: null,
  avatar_url: null,
  permissions: ROLE_DEFAULT_PERMISSIONS['staff'],
}

export default function UserPage() {
  const { user: currentUser } = useAuthStore()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState<UserForm>(defaultForm)
  const [del, setDel] = useState<User | null>(null)

  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: fetchUsers })
  
  const visibleUsers = users.filter(u => {
    if (currentUser?.role !== 'developer' && u.role === 'developer') return false
    return true
  })

  const filtered = visibleUsers.filter(u => u.name.toLowerCase().includes(search.toLowerCase()))

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('Nama wajib diisi')
      
      let savedUser: User
      if (editing) {
        savedUser = await updateUser(editing.id, form)
      } else {
        if (!form.password) throw new Error('Password wajib diisi')
        savedUser = await createUser(form)
      }
      
      // Save permissions
      await saveUserPermissions(savedUser.id, form.permissions)
      return savedUser
    },
    onSuccess: () => { 
      toast.success('User dan hak akses disimpan')
      qc.invalidateQueries({ queryKey: ['users'] })
      setModal(false) 
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => { toast.success('User dihapus'); qc.invalidateQueries({ queryKey: ['users'] }); setDel(null) },
    onError: (e: Error) => toast.error(e.message),
  })

  const openAdd = () => { 
    setEditing(null)
    setForm({ ...defaultForm, permissions: [...ROLE_DEFAULT_PERMISSIONS['staff']] })
    setModal(true) 
  }

  const openEdit = async (u: User) => { 
    setEditing(u)
    const perms = await getUserPermissions(u.id)
    setForm({ 
      name: u.name, 
      address: u.address, 
      phone: u.phone, 
      role: u.role, 
      password: '', 
      is_active: u.is_active, 
      branch_id: u.branch_id, 
      avatar_url: u.avatar_url,
      permissions: perms.length > 0 ? perms : [...ROLE_DEFAULT_PERMISSIONS[u.role]]
    })
    setModal(true) 
  }

  const handleRoleChange = (newRole: UserRole) => {
    setForm(f => ({ 
      ...f, 
      role: newRole,
      permissions: [...ROLE_DEFAULT_PERMISSIONS[newRole]]
    }))
  }

  const togglePerm = (key: PermissionKey) => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(key) 
        ? f.permissions.filter(p => p !== key) 
        : [...f.permissions, key]
    }))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Manajemen User</h1><p className="page-subtitle">{visibleUsers.length} user terdaftar</p></div>
        {(currentUser?.role === 'developer' || currentUser?.role === 'manager') && (
          <Button variant="primary" icon={<Plus size={16} />} onClick={openAdd}>Tambah User</Button>
        )}
      </div>
      <Input placeholder="Cari user..." value={search} onChange={e => setSearch(e.target.value)} leftIcon={<Search size={16} />} />
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-10"><span className="loading-spinner" /></div>
        ) : (
          filtered.map(u => (
            <div key={u.id} className="card p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold" style={{ background: 'var(--accent-primary)' }}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{u.name}</p>
                    <div className="flex gap-2 mt-1">
                      {roleBadge(u.role)}
                      {statusBadge(u.is_active ? 'active' : 'inactive')}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-1">
                  {(currentUser?.role === 'developer' || (currentUser?.role === 'manager' && u.role !== 'developer')) && (
                    <>
                      <button onClick={() => openEdit(u)} className="p-2 rounded-xl bg-blue-50 text-blue-500 hover:bg-blue-100" title="Edit & Hak Akses"><Pencil size={18} /></button>
                      {u.id !== currentUser.id && u.role !== 'developer' && (
                        <button onClick={() => setDel(u)} className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100"><Trash2 size={18} /></button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <div>
                  <p className="text-xs opacity-60" style={{ color: 'var(--text-muted)' }}>Telepon</p>
                  <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>{u.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-xs opacity-60" style={{ color: 'var(--text-muted)' }}>Alamat</p>
                  <p className="font-medium truncate" style={{ color: 'var(--text-secondary)' }}>{u.address || '-'}</p>
                </div>
              </div>
            </div>
          ))
        )}
        {filtered.length === 0 && !isLoading && (
          <div className="text-center py-10 text-sm opacity-50">User tidak ditemukan</div>
        )}
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit User & Hak Akses' : 'Tambah User & Hak Akses'} size="lg"
        footer={<><Button variant="secondary" onClick={() => setModal(false)}>Batal</Button><Button variant="primary" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>Simpan</Button></>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-bold border-b pb-2" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}>Informasi Dasar</h3>
            <Input label="Nama *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Input label="Alamat" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            <Input label="Nomor HP" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <Select label="Role" value={form.role} onChange={e => handleRoleChange(e.target.value as UserRole)}
              options={[
                ...(currentUser?.role === 'developer' ? [{ value: 'developer', label: 'Developer' }] : []),
                { value: 'manager', label: 'Manager' },
                { value: 'staff', label: 'Staff' }
              ]} />
            <Input label={editing ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password *'} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            <div className="flex items-center gap-2">
              <input type="checkbox" id="active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4" />
              <label htmlFor="active" className="text-sm" style={{ color: 'var(--text-secondary)' }}>User aktif</label>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold border-b pb-2" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}>Hak Akses (Centang)</h3>
            <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2">
              {ALL_PERMISSIONS.map(perm => {
                const isSelected = form.permissions.includes(perm.key)
                return (
                  <label key={perm.key} className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer border transition-all hover:bg-gray-50" 
                    style={{ 
                      background: isSelected ? 'rgba(37,99,235,0.05)' : 'transparent',
                      borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-color)'
                    }}>
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 bg-white'}`}>
                        {isSelected && <Check size={14} strokeWidth={3} />}
                      </div>
                      <span className="text-sm font-medium" style={{ color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{perm.label}</span>
                    </div>
                    <input type="checkbox" checked={isSelected} onChange={() => togglePerm(perm.key)} className="hidden" />
                  </label>
                )
              })}
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!del} onClose={() => setDel(null)} title="Hapus User"
        footer={<><Button variant="secondary" onClick={() => setDel(null)}>Batal</Button><Button variant="danger" loading={deleteMutation.isPending} onClick={() => del && deleteMutation.mutate(del.id)}>Hapus</Button></>}>
        <p style={{ color: 'var(--text-secondary)' }}>Yakin hapus user <strong>{del?.name}</strong>?</p>
      </Modal>
    </div>
  )
}

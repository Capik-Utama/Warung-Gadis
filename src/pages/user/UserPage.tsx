import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Search, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchUsers, createUser, updateUser, deleteUser, getUserPermissions, saveUserPermissions } from '@/services/userService'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { roleBadge, statusBadge } from '@/components/ui/Badge'
import { useAuthStore } from '@/store/authStore'
import { ALL_PERMISSIONS } from '@/permissions'
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
}

export default function UserPage() {
  const { user: currentUser } = useAuthStore()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [permModal, setPermModal] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState<typeof defaultForm>(defaultForm)
  const [del, setDel] = useState<User | null>(null)
  const [permUser, setPermUser] = useState<User | null>(null)
  const [selectedPerms, setSelectedPerms] = useState<PermissionKey[]>([])

  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: fetchUsers })
  const filtered = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()))

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!form.name.trim()) throw new Error('Nama wajib diisi')
      if (editing) return updateUser(editing.id, form)
      if (!form.password) throw new Error('Password wajib diisi')
      return createUser(form)
    },
    onSuccess: () => { toast.success('User disimpan'); qc.invalidateQueries({ queryKey: ['users'] }); setModal(false) },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => { toast.success('User dihapus'); qc.invalidateQueries({ queryKey: ['users'] }); setDel(null) },
    onError: (e: Error) => toast.error(e.message),
  })

  const permMutation = useMutation({
    mutationFn: () => saveUserPermissions(permUser!.id, selectedPerms),
    onSuccess: () => { toast.success('Hak akses disimpan'); setPermModal(false) },
    onError: (e: Error) => toast.error(e.message),
  })

  const openAdd = () => { setEditing(null); setForm(defaultForm); setModal(true) }
  const openEdit = (u: User) => { setEditing(u); setForm({ name: u.name, address: u.address, phone: u.phone, role: u.role, password: '', is_active: u.is_active, branch_id: u.branch_id, avatar_url: u.avatar_url }); setModal(true) }
  const openPerms = async (u: User) => {
    setPermUser(u)
    const perms = await getUserPermissions(u.id)
    setSelectedPerms(perms)
    setPermModal(true)
  }

  const togglePerm = (key: PermissionKey) => {
    setSelectedPerms(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key])
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Manajemen User</h1><p className="page-subtitle">{users.length} user terdaftar</p></div>
        {currentUser?.role === 'owner' && <Button variant="primary" icon={<Plus size={16} />} onClick={openAdd}>Tambah User</Button>}
      </div>
      <Input placeholder="Cari user..." value={search} onChange={e => setSearch(e.target.value)} leftIcon={<Search size={16} />} />
      <div className="table-container">
        <table className="table">
          <thead><tr><th>Nama</th><th>Role</th><th>Telepon</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={5} className="text-center py-10"><span className="loading-spinner" /></td></tr> :
              filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: 'var(--accent-primary)' }}>{u.name.charAt(0).toUpperCase()}</div>
                      <div>
                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{u.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{u.address}</p>
                      </div>
                    </div>
                  </td>
                  <td>{roleBadge(u.role)}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{u.phone}</td>
                  <td>{statusBadge(u.is_active ? 'active' : 'inactive')}</td>
                  <td>
                    <div className="flex gap-1">
                      {currentUser?.role === 'owner' && (
                        <>
                          <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Pencil size={15} /></button>
                          <button onClick={() => openPerms(u)} className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-500" title="Hak akses"><Shield size={15} /></button>
                          {u.id !== currentUser.id && u.role !== 'owner' && (
                            <button onClick={() => setDel(u)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={15} /></button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit User' : 'Tambah User'}
        footer={<><Button variant="secondary" onClick={() => setModal(false)}>Batal</Button><Button variant="primary" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>Simpan</Button></>}>
        <div className="space-y-4">
          <Input label="Nama *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Alamat" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          <Input label="Nomor HP" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <Select label="Role" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as 'owner'|'manager'|'staff' }))}
            options={[{ value: 'owner', label: 'Owner' }, { value: 'manager', label: 'Manager' }, { value: 'staff', label: 'Staff' }]} />
          <Input label={editing ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password *'} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4" />
            <label htmlFor="active" className="text-sm" style={{ color: 'var(--text-secondary)' }}>User aktif</label>
          </div>
        </div>
      </Modal>

      {/* Permissions Modal */}
      <Modal isOpen={permModal} onClose={() => setPermModal(false)} title={`Hak Akses: ${permUser?.name}`} size="lg"
        footer={<><Button variant="secondary" onClick={() => setPermModal(false)}>Batal</Button><Button variant="primary" loading={permMutation.isPending} onClick={() => permMutation.mutate()}>Simpan</Button></>}>
        <div className="grid grid-cols-2 gap-2">
          {ALL_PERMISSIONS.map(perm => (
            <label key={perm.key} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-opacity-5" style={{ background: selectedPerms.includes(perm.key) ? 'rgba(37,99,235,0.05)' : 'transparent' }}>
              <input type="checkbox" checked={selectedPerms.includes(perm.key)} onChange={() => togglePerm(perm.key)} className="w-4 h-4" />
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{perm.label}</span>
            </label>
          ))}
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

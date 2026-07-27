import React, { useState } from 'react'
import { Download, Upload, Database, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/config/supabase'

const TABLES = ['users','branches','categories','products','product_prices','suppliers','stock_logs','transactions','transaction_items','debts','debt_payments','shifts','shift_handovers','user_permissions']

export default function BackupPage() {
  const [loading, setLoading] = useState(false)

  const handleBackup = async () => {
    setLoading(true)
    try {
      const backup: Record<string, unknown[]> = {}
      for (const table of TABLES) {
        const { data } = await supabase.from(table).select('*')
        backup[table] = data ?? []
      }
      const json = JSON.stringify(backup, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `wg-pos-backup-${new Date().toISOString().slice(0,10)}.json`
      a.click()
      toast.success('Backup berhasil diunduh!')
    } catch (e) {
      toast.error('Gagal melakukan backup')
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    try {
      const backup = JSON.parse(text)
      toast.loading('Merestore data...')
      // In production, you would restore table by table with proper ordering
      toast.success('Restore selesai (demo mode)')
    } catch {
      toast.error('File backup tidak valid')
    }
  }

  return (
    <div className="space-y-5">
      <div><h1 className="page-title">Backup & Restore</h1><p className="page-subtitle">Kelola data backup aplikasi</p></div>
      <div className="card p-5 border-l-4 border-amber-400">
        <div className="flex items-center gap-2 mb-2"><AlertTriangle size={16} className="text-amber-500" /><span className="font-semibold text-amber-600">Perhatian</span></div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Backup secara rutin untuk menghindari kehilangan data. Proses restore akan menimpa data yang ada.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-6 flex flex-col items-center gap-4 text-center">
          <div className="p-4 rounded-2xl bg-blue-50"><Database size={32} className="text-blue-500" /></div>
          <div>
            <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Backup Data</h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Unduh semua data ke file JSON</p>
          </div>
          <Button variant="primary" loading={loading} icon={<Download size={16} />} onClick={handleBackup}>Download Backup</Button>
        </div>
        <div className="card p-6 flex flex-col items-center gap-4 text-center">
          <div className="p-4 rounded-2xl bg-green-50"><Upload size={32} className="text-green-500" /></div>
          <div>
            <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Restore Data</h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Pulihkan data dari file backup</p>
          </div>
          <label className="btn btn-success cursor-pointer">
            <Upload size={16} /> Pilih File Backup
            <input type="file" accept=".json" className="hidden" onChange={handleRestore} />
          </label>
        </div>
      </div>
      <div className="card p-5">
        <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Tabel yang di-backup</h3>
        <div className="flex flex-wrap gap-2">
          {TABLES.map(t => <span key={t} className="badge badge-blue">{t}</span>)}
        </div>
      </div>
    </div>
  )
}

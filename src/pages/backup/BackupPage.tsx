import React, { useState } from 'react'
import { Download, Upload, Database, AlertTriangle, FileSpreadsheet } from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
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
      const t = toast.loading('Merestore data...')
      
      // Proses restore berurutan untuk menjaga integritas (foreign keys)
      const orderedTables = [
        'branches', 'categories', 'users', 'products', 'suppliers', 
        'product_prices', 'stock_logs', 'transactions', 'transaction_items', 
        'debts', 'debt_payments', 'shifts', 'shift_handovers', 'user_permissions'
      ]

      for (const table of orderedTables) {
        if (backup[table] && backup[table].length > 0) {
          // Hapus data lama (opsional, tergantung kebijakan)
          // await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
          
          const { error } = await supabase.from(table).upsert(backup[table])
          if (error) console.error(`Error restore ${table}:`, error)
        }
      }
      
      toast.dismiss(t)
      toast.success('Restore data berhasil!')
    } catch (err) {
      toast.error('File backup tidak valid')
    }
  }

  // EXPORT EXCEL
  const handleExportExcel = async () => {
    setLoading(true)
    const t = toast.loading('Menyiapkan file Excel...')
    try {
      const wb = XLSX.utils.book_new()
      
      const tablesToExport = [
        { name: 'Produk', table: 'products' },
        { name: 'Kategori', table: 'categories' },
        { name: 'Stok', table: 'stock_logs' },
        { name: 'Hutang', table: 'debts' },
        { name: 'Cabang', table: 'branches' },
        { name: 'User', table: 'users' }
      ]

      for (const item of tablesToExport) {
        const { data } = await supabase.from(item.table).select('*')
        const ws = XLSX.utils.json_to_sheet(data || [])
        XLSX.utils.book_append_sheet(wb, ws, item.name)
      }

      XLSX.writeFile(wb, `WG-POS-Data-${new Date().toISOString().slice(0,10)}.xlsx`)
      toast.dismiss(t)
      toast.success('Export Excel berhasil!')
    } catch (err) {
      toast.dismiss(t)
      toast.error('Gagal export Excel')
    } finally {
      setLoading(false)
    }
  }

  // IMPORT EXCEL
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const t = toast.loading('Mengimport data dari Excel...')
    try {
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data)
      
      const tableMapping: Record<string, string> = {
        'Produk': 'products',
        'Kategori': 'categories',
        'Stok': 'stock_logs',
        'Hutang': 'debts',
        'Cabang': 'branches',
        'User': 'users'
      }

      for (const sheetName of wb.SheetNames) {
        const tableName = tableMapping[sheetName]
        if (tableName) {
          const jsonData = XLSX.utils.sheet_to_json(wb.Sheets[sheetName])
          if (jsonData.length > 0) {
            const { error } = await supabase.from(tableName).upsert(jsonData)
            if (error) throw error
          }
        }
      }

      toast.dismiss(t)
      toast.success('Import Excel berhasil!')
    } catch (err) {
      toast.dismiss(t)
      toast.error('Gagal import Excel. Pastikan format file benar.')
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

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-6 flex flex-col items-center gap-4 text-center">
          <div className="p-4 rounded-2xl bg-green-50"><FileSpreadsheet size={32} className="text-green-600" /></div>
          <div>
            <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Export Excel</h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Unduh data ke format Excel (.xlsx)</p>
          </div>
          <Button variant="success" loading={loading} icon={<Download size={16} />} onClick={handleExportExcel}>Export ke Excel</Button>
        </div>
        <div className="card p-6 flex flex-col items-center gap-4 text-center">
          <div className="p-4 rounded-2xl bg-amber-50"><FileSpreadsheet size={32} className="text-amber-600" /></div>
          <div>
            <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Import Excel</h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Upload data dari file Excel</p>
          </div>
          <label className="btn btn-warning cursor-pointer">
            <Upload size={16} /> Pilih File Excel
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportExcel} />
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

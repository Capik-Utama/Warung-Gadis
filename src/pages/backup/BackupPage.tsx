import React, { useState } from 'react'
import { Download, Upload, AlertTriangle, FileSpreadsheet } from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/config/supabase'

const ORDERED_TABLES = [
  'branches', 'categories', 'users', 'products', 'suppliers', 
  'product_prices', 'stock_logs', 'transactions', 'transaction_items', 
  'debts', 'debt_payments', 'shifts', 'shift_handovers', 'user_permissions'
]

const SHEET_MAPPING: Record<string, string> = {
  'Cabang': 'branches',
  'Kategori': 'categories',
  'User': 'users',
  'Produk': 'products',
  'Supplier': 'suppliers',
  'Harga_Produk': 'product_prices',
  'Log_Stok': 'stock_logs',
  'Transaksi': 'transactions',
  'Item_Transaksi': 'transaction_items',
  'Hutang': 'debts',
  'Bayar_Hutang': 'debt_payments',
  'Shift': 'shifts',
  'Serah_Terima': 'shift_handovers',
  'Hak_Akses': 'user_permissions'
}

export default function BackupPage() {
  const [loading, setLoading] = useState(false)

  // EXPORT EXCEL (BACKUP TOTAL)
  const handleBackupExcel = async () => {
    setLoading(true)
    const t = toast.loading('Menyiapkan Backup Excel...')
    try {
      const wb = XLSX.utils.book_new()
      
      // Balik mapping untuk mendapatkan nama sheet dari nama tabel
      const reverseMapping = Object.fromEntries(
        Object.entries(SHEET_MAPPING).map(([sheet, table]) => [table, sheet])
      )

      for (const table of ORDERED_TABLES) {
        const { data } = await supabase.from(table).select('*')
        const sheetName = reverseMapping[table] || table
        const ws = XLSX.utils.json_to_sheet(data || [])
        XLSX.utils.book_append_sheet(wb, ws, sheetName)
      }

      XLSX.writeFile(wb, `WG-POS-FULL-BACKUP-${new Date().toISOString().slice(0,10)}.xlsx`)
      toast.dismiss(t)
      toast.success('Backup Excel berhasil diunduh!')
    } catch {
      toast.dismiss(t)
      toast.error('Gagal melakukan backup Excel')
    } finally {
      setLoading(false)
    }
  }

  // IMPORT EXCEL (RESTORE TOTAL)
  const handleRestoreExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const confirm = window.confirm('Peringatan: Proses restore akan memperbarui data yang ada. Lanjutkan?')
    if (!confirm) return

    const t = toast.loading('Merestore data dari Excel...')
    try {
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data)
      
      // Proses berdasarkan urutan tabel untuk menjaga foreign keys
      for (const table of ORDERED_TABLES) {
        const sheetName = Object.keys(SHEET_MAPPING).find(key => SHEET_MAPPING[key] === table)
        if (sheetName && wb.Sheets[sheetName]) {
          const jsonData = XLSX.utils.sheet_to_json(wb.Sheets[sheetName])
          if (jsonData.length > 0) {
            // Gunakan upsert untuk update data lama atau insert data baru
            const { error } = await supabase.from(table).upsert(jsonData)
            if (error) {
              console.error(`Error restore ${table}:`, error)
              // Kita lanjutkan ke tabel berikutnya meskipun ada satu yang gagal
            }
          }
        }
      }

      toast.dismiss(t)
      toast.success('Restore data dari Excel berhasil!')
      // Refresh halaman agar data baru terlihat
      setTimeout(() => window.location.reload(), 1500)
    } catch {
      toast.dismiss(t)
      toast.error('Gagal restore Excel. Pastikan format file benar.')
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
          <div className="p-4 rounded-2xl bg-blue-50"><FileSpreadsheet size={32} className="text-blue-500" /></div>
          <div>
            <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Backup ke Excel</h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Unduh seluruh data database ke satu file Excel</p>
          </div>
          <Button variant="primary" loading={loading} icon={<Download size={16} />} onClick={handleBackupExcel}>Download Backup Excel</Button>
        </div>
        <div className="card p-6 flex flex-col items-center gap-4 text-center">
          <div className="p-4 rounded-2xl bg-green-50"><Upload size={32} className="text-green-500" /></div>
          <div>
            <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Restore dari Excel</h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Pulihkan seluruh data dari file Backup Excel</p>
          </div>
          <label className="btn btn-success cursor-pointer">
            <Upload size={16} /> Pilih File Excel
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleRestoreExcel} />
          </label>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Tabel yang di-backup</h3>
        <div className="flex flex-wrap gap-2">
          {ORDERED_TABLES.map(t => <span key={t} className="badge badge-blue">{t}</span>)}
        </div>
      </div>
    </div>
  )
}

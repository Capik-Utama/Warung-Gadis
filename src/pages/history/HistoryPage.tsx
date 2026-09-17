import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, History, Filter, RefreshCw } from 'lucide-react'
import { fetchAuditLogs, auditCategoryLabel } from '@/services/auditLogService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/store/authStore'

function dateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function isoStart(value: string) { return new Date(`${value}T00:00:00`).toISOString() }
function isoEnd(value: string) { const date = new Date(`${value}T00:00:00`); date.setDate(date.getDate() + 1); return date.toISOString() }

const categories = ['Penjualan', 'Stok', 'Staf', 'Shift', 'Cabang', 'Produk', 'Kategori', 'Member/Hutang', 'Pembayaran Member', 'Pengaturan']

export default function HistoryPage() {
  const today = new Date()
  const [fromDate, setFromDate] = useState(dateInputValue(new Date(today.getFullYear(), today.getMonth(), 1)))
  const [toDate, setToDate] = useState(dateInputValue(today))
  const [category, setCategory] = useState('')
  const viewerRole = useAuthStore((state) => state.user?.role)
  const filters = useMemo(() => ({ from: isoStart(fromDate), to: isoEnd(toDate), category: category || undefined, viewerRole }), [fromDate, toDate, category, viewerRole])
  const { data: logs = [], isLoading, refetch } = useQuery({ queryKey: ['audit-logs', filters], queryFn: () => fetchAuditLogs(filters) })
  const invalidRange = fromDate > toDate

  const downloadPdf = () => {
    if (invalidRange) return
    const previousTitle = document.title
    document.title = `Riwayat Aktivitas ${fromDate} - ${toDate}`
    window.print()
    window.setTimeout(() => { document.title = previousTitle }, 500)
  }

  return (
    <div className="space-y-5 history-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="page-title flex items-center gap-2"><History size={24} /> Log / History</h1><p className="page-subtitle">Riwayat semua aktivitas aplikasi. Developer melihat semua log, manager tidak melihat aktivitas developer.</p></div>
        <div className="flex gap-2 no-print"><Button variant="secondary" size="sm" icon={<RefreshCw size={15} />} onClick={() => refetch()}>Refresh</Button><Button variant="primary" size="sm" icon={<Download size={15} />} onClick={downloadPdf} disabled={invalidRange}>Download PDF</Button></div>
      </div>

      <div className="card p-4 no-print">
        <div className="flex items-center gap-2 font-semibold mb-3"><Filter size={17} style={{ color: 'var(--accent-primary)' }} /> Filter riwayat</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input label="Dari tanggal" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          <Input label="Sampai tanggal" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          <label className="label">Kategori<select className="input mt-1" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Semua kategori</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        </div>
        {invalidRange && <p className="text-xs mt-2" style={{ color: 'var(--danger)' }}>Tanggal mulai tidak boleh setelah tanggal akhir.</p>}
        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>PDF dibuat melalui dialog cetak browser — pilih “Save as PDF”. Data lebih dari 1 tahun dihapus otomatis oleh Supabase.</p>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3"><h3 className="font-semibold">{logs.length} aktivitas ditemukan</h3><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{fromDate} s/d {toDate}</span></div>
        {isLoading ? <p className="py-10 text-center text-sm">Memuat riwayat...</p> : logs.length === 0 ? <p className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Belum ada aktivitas pada periode ini.</p> : <div className="overflow-x-auto"><table className="table"><thead><tr><th>Waktu</th><th>Kategori</th><th>Aktivitas</th><th>Pelaku</th><th>Cabang</th><th>ID Referensi</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id}><td className="whitespace-nowrap">{new Date(log.created_at).toLocaleString('id-ID')}</td><td><span className="badge badge-blue">{auditCategoryLabel(log.category)}</span></td><td className="font-medium">{log.description}</td><td>{log.actor_name ?? 'Sistem'}</td><td>{log.branch?.[0]?.name ?? log.branch_id ?? '-'}</td><td className="text-xs">{log.entity_id ?? '-'}</td></tr>)}</tbody></table></div>}
      </div>

      <style>{`@media print { .no-print, nav, aside, header { display: none !important; } .history-page { padding: 0 !important; } .card { box-shadow: none !important; border: 0 !important; } body { background: white !important; } }`}</style>
    </div>
  )
}

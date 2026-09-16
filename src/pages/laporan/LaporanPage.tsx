import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileSpreadsheet, FileText, TrendingUp, Users, Package, Filter, CalendarRange } from 'lucide-react'
import { getDailySales, getTopProducts, getDetailedReport, getReportShifts } from '@/services/reportService'
import { fetchBranches } from '@/services/branchService'
import { fetchUsers } from '@/services/userService'
import { StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatCurrency } from '@/utils/format'
import { useAuthStore } from '@/store/authStore'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { DetailedReportRow } from '@/types/report'

type ReportMode = 'total' | 'shift' | 'staff' | 'branch'

function dateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function startOfInputDate(value: string) {
  return new Date(`${value}T00:00:00`).toISOString()
}

function endOfInputDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  date.setDate(date.getDate() + 1)
  return date.toISOString()
}

function groupRows(rows: DetailedReportRow[], mode: ReportMode) {
  if (mode === 'total') return [{ label: 'Total periode', total: rows.reduce((sum, row) => sum + row.amount, 0), count: rows.length }]
  const groups = new Map<string, { label: string; total: number; count: number }>()
  rows.forEach((row) => {
    const key = mode === 'shift' ? row.shift_id ?? 'tanpa-shift' : mode === 'staff' ? row.staff_id : row.branch_id
    const label = mode === 'shift'
      ? row.shift_id ? `Shift ${row.shift_number ?? '-'} (${row.shift_number === 1 ? 'Siang' : 'Malam'}) • ${row.staff_name} • ${row.branch_name}` : 'Tanpa shift'
      : mode === 'staff' ? row.staff_name : row.branch_name
    const existing = groups.get(key) ?? { label, total: 0, count: 0 }
    groups.set(key, { label: existing.label, total: existing.total + row.amount, count: existing.count + 1 })
  })
  return Array.from(groups.values()).sort((a, b) => b.total - a.total)
}

export default function LaporanPage() {
  const { selectedBranch, hasPermission } = useAuthStore()
  const canViewReport = hasPermission('view_report')
  const [range, setRange] = useState<'7' | '30' | '90'>('30')
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  const [fromDate, setFromDate] = useState(dateInputValue(firstDay))
  const [toDate, setToDate] = useState(dateInputValue(today))
  const [branchId, setBranchId] = useState('')
  const [staffId, setStaffId] = useState('')
  const [shiftId, setShiftId] = useState('')
  const [mode, setMode] = useState<ReportMode>('total')

  const { data: branches = [] } = useQuery({ queryKey: ['report-branches'], queryFn: fetchBranches })
  const { data: users = [] } = useQuery({ queryKey: ['report-users'], queryFn: fetchUsers })
  const reportFilters = useMemo(() => ({
    from: startOfInputDate(fromDate),
    to: endOfInputDate(toDate),
    branchId: branchId || undefined,
    staffId: staffId || undefined,
  }), [fromDate, toDate, branchId, staffId])
  const { data: shifts = [] } = useQuery({
    queryKey: ['report-shifts', reportFilters],
    queryFn: () => getReportShifts(reportFilters),
  })
  const { data: detail = { rows: [], summary: { total: 0, transaction_count: 0, staff_count: 0, branch_count: 0, shift_count: 0 } }, isLoading: loadingDetail } = useQuery({
    queryKey: ['detailed-report', reportFilters, shiftId],
    queryFn: () => getDetailedReport({ ...reportFilters, shiftId: shiftId || undefined }),
  })
  const { data: salesData = [] } = useQuery({
    queryKey: ['sales-report', selectedBranch?.id ?? '', range],
    queryFn: () => getDailySales(selectedBranch?.id ?? '', parseInt(range)),
    enabled: !!selectedBranch?.id,
  })
  const { data: topProducts = [] } = useQuery({
    queryKey: ['top-products-report', selectedBranch?.id ?? ''],
    queryFn: () => getTopProducts(selectedBranch?.id ?? '', 10),
    enabled: !!selectedBranch?.id,
  })

  const groupedRows = useMemo(() => groupRows(detail.rows, mode), [detail.rows, mode])
  const activeShiftOptions = shifts.filter((shift) => (!branchId || shift.branch_id === branchId) && (!staffId || shift.staff_id === staffId))
  const exportToCSV = (data: unknown[], filename: string) => {
    if (data.length === 0) return
    const rows = data as Record<string, unknown>[]
    const headers = Object.keys(rows[0]).join(',')
    const csv = [headers, ...rows.map((row) => Object.values(row).map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!canViewReport) {
    return <div className="flex flex-col items-center justify-center py-20 text-center"><TrendingUp size={32} className="text-red-500 mb-4" /><h2 className="text-xl font-bold mb-2">Akses Ditolak</h2><p style={{ color: 'var(--text-secondary)' }}>Anda tidak memiliki hak akses untuk melihat laporan.</p></div>
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="page-title">Laporan Penjualan</h1><p className="page-subtitle">Telusuri pendapatan berdasarkan total, shift, staf, cabang, dan periode.</p></div>
        <div className="flex gap-2"><Button variant="secondary" size="sm" icon={<FileSpreadsheet size={15} />} onClick={() => exportToCSV(detail.rows, 'laporan-detail')}>Export Excel</Button><Button variant="secondary" size="sm" icon={<FileText size={15} />} onClick={() => window.print()}>Cetak / PDF</Button></div>
      </div>

      <div className="card p-4 space-y-4">
        <div className="flex items-center gap-2 font-semibold"><Filter size={17} style={{ color: 'var(--accent-primary)' }} /> Filter laporan</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Input label="Dari tanggal" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          <Input label="Sampai tanggal" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          <label className="label">Cabang<select className="input mt-1" value={branchId} onChange={(event) => { setBranchId(event.target.value); setShiftId('') }}><option value="">Semua cabang</option>{branches.filter((branch) => branch.is_active).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
          <label className="label">Staf<select className="input mt-1" value={staffId} onChange={(event) => { setStaffId(event.target.value); setShiftId('') }}><option value="">Semua staf</option>{users.filter((user) => user.is_active).map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
          <label className="label">Shift<select className="input mt-1" value={shiftId} onChange={(event) => setShiftId(event.target.value)}><option value="">Semua shift</option>{activeShiftOptions.map((shift) => <option key={shift.id} value={shift.id}>Shift {shift.number} ({shift.number === 1 ? 'Siang' : 'Malam'})</option>)}</select></label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Tampilkan per:</span>
          {([['total', 'Total'], ['shift', 'Shift'], ['staff', 'Staf'], ['branch', 'Cabang']] as [ReportMode, string][]).map(([key, label]) => <button key={key} onClick={() => setMode(key)} className="px-3 py-1.5 rounded-full text-xs font-semibold border" style={{ background: mode === key ? 'var(--accent-primary)' : 'var(--bg-card)', color: mode === key ? 'white' : 'var(--text-secondary)', borderColor: mode === key ? 'var(--accent-primary)' : 'var(--border-color)' }}>{label}</button>)}
          <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}><CalendarRange size={13} className="inline mr-1" />{fromDate} s/d {toDate}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard title="Total Pendapatan" value={formatCurrency(detail.summary.total)} icon={<TrendingUp size={19} className="text-green-600" />} iconBg="bg-green-50" />
        <StatCard title="Transaksi" value={detail.summary.transaction_count} icon={<Package size={19} className="text-purple-600" />} iconBg="bg-purple-50" />
        <StatCard title="Staf" value={detail.summary.staff_count} icon={<Users size={19} className="text-blue-600" />} iconBg="bg-blue-50" />
        <StatCard title="Cabang" value={detail.summary.branch_count} icon={<TrendingUp size={19} className="text-amber-600" />} iconBg="bg-amber-50" />
        <StatCard title="Shift" value={detail.summary.shift_count} icon={<CalendarRange size={19} className="text-cyan-600" />} iconBg="bg-cyan-50" />
      </div>

      <div className="card p-4"><h3 className="font-semibold mb-3">Ringkasan {mode === 'total' ? 'total periode' : mode === 'shift' ? 'per shift' : mode === 'staff' ? 'per staf' : 'per cabang'}</h3>{loadingDetail ? <p className="py-6 text-center text-sm">Memuat laporan...</p> : groupedRows.length === 0 ? <p className="py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Tidak ada data pada filter ini.</p> : <div className="overflow-x-auto"><table className="table"><thead><tr><th>Kelompok</th><th>Jumlah transaksi</th><th className="text-right">Pendapatan</th></tr></thead><tbody>{groupedRows.map((row) => <tr key={row.label}><td className="font-medium">{row.label}</td><td>{row.count}</td><td className="text-right font-bold" style={{ color: 'var(--accent-primary)' }}>{formatCurrency(row.total)}</td></tr>)}</tbody></table></div>}</div>

      <div className="card p-4"><div className="flex items-center justify-between mb-3"><h3 className="font-semibold">Rincian transaksi</h3><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{detail.rows.length} baris</span></div><div className="overflow-x-auto"><table className="table"><thead><tr><th>Tanggal</th><th>Kode</th><th>Jenis</th><th>Staf</th><th>Cabang</th><th>Shift</th><th>Metode</th><th className="text-right">Nominal</th></tr></thead><tbody>{detail.rows.slice(0, 300).map((row) => <tr key={`${row.kind}-${row.id}`}><td className="whitespace-nowrap">{new Date(row.date).toLocaleString('id-ID')}</td><td>{row.code}</td><td>{row.kind}</td><td>{row.staff_name}</td><td>{row.branch_name}</td><td>{row.shift_number ? `Shift ${row.shift_number} (${row.shift_number === 1 ? 'Siang' : 'Malam'})` : '-'}</td><td>{row.payment_method}</td><td className="text-right font-semibold">{formatCurrency(row.amount)}</td></tr>)}</tbody></table></div></div>

      <div className="card p-5"><h3 className="font-semibold mb-4">Grafik penjualan cabang terpilih</h3><div className="flex gap-2 mb-4">{(['7', '30', '90'] as const).map((value) => <button key={value} onClick={() => setRange(value)} className="px-3 py-1.5 rounded-full text-xs border" style={{ background: range === value ? 'var(--accent-primary)' : 'var(--bg-card)', color: range === value ? 'white' : 'var(--text-secondary)', borderColor: 'var(--border-color)' }}>{value} Hari</button>)}</div>{selectedBranch ? <ResponsiveContainer width="100%" height={230}><BarChart data={salesData}><CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(value: number) => formatCurrency(value)} /><Legend /><Bar dataKey="total" fill="#2563eb" name="Pendapatan" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>Pilih cabang untuk melihat grafik harian.</p>}</div>

      {selectedBranch && topProducts.length > 0 && <div className="card p-5"><h3 className="font-semibold mb-3">Produk terlaris di {selectedBranch.name}</h3><div className="grid md:grid-cols-2 gap-2">{topProducts.map((product, index) => <div key={product.product_id} className="flex items-center gap-3 py-2"><span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: index < 3 ? '#2563eb' : '#94a3b8' }}>{index + 1}</span><span className="flex-1 text-sm">{product.product_name}</span><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{product.quantity} terjual</span><b className="text-sm">{formatCurrency(product.revenue)}</b></div>)}</div></div>}

      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Contoh penggunaan: pilih tanggal 1–5, staf A, dan Shift 2 untuk melihat total pendapatan staf A pada shift tersebut. Transaksi dicocokkan ke shift berdasarkan waktu transaksi, staf, dan cabang.</p>
    </div>
  )
}

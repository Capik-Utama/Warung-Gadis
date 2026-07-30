import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, FileSpreadsheet, FileText, TrendingUp, Users, Package } from 'lucide-react'
import { getDailySales, getTopProducts, getStaffSales, getMonthlyRevenue } from '@/services/reportService'
import { StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatDate } from '@/utils/format'
import { useAuthStore } from '@/store/authStore'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function LaporanPage() {
  const { selectedBranch, hasPermission } = useAuthStore()
  const canViewReport = hasPermission('view_report')
  const branchId = selectedBranch?.id ?? ''
  const [range, setRange] = useState<'7' | '30' | '90'>('30')

  const { data: salesData = [] } = useQuery({
    queryKey: ['sales-report', branchId, range],
    queryFn: () => getDailySales(branchId, parseInt(range)),
    enabled: !!branchId,
  })

  const { data: topProducts = [] } = useQuery({
    queryKey: ['top-products-report', branchId],
    queryFn: () => getTopProducts(branchId, 10),
    enabled: !!branchId,
  })

  const { data: staffSales = [] } = useQuery({
    queryKey: ['staff-sales', branchId],
    queryFn: () => getStaffSales(branchId),
    enabled: !!branchId,
  })

  const { data: monthlyRevenue = 0 } = useQuery({
    queryKey: ['monthly-revenue', branchId],
    queryFn: () => getMonthlyRevenue(branchId),
    enabled: !!branchId,
  })

  const totalRevenue = salesData.reduce((s, d) => s + d.total, 0)
  const totalTransactions = salesData.reduce((s, d) => s + d.transaction_count, 0)
  const avgPerDay = salesData.length > 0 ? totalRevenue / salesData.length : 0

  const exportToCSV = (data: unknown[], filename: string) => {
    if (data.length === 0) return
    const headers = Object.keys(data[0] as object).join(',')
    const rows = data.map((row) => Object.values(row as object).join(','))
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.csv`
    a.click()
  }

  if (!canViewReport) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <TrendingUp size={32} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Akses Ditolak</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Anda tidak memiliki hak akses untuk melihat laporan.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Laporan</h1>
          <p className="page-subtitle">Analisa penjualan dan kinerja</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<FileSpreadsheet size={15} />} onClick={() => exportToCSV(salesData, 'laporan-penjualan')}>
            Export Excel
          </Button>
          <Button variant="secondary" size="sm" icon={<FileText size={15} />}>Export PDF</Button>
        </div>
      </div>

      {/* Range selector */}
      <div className="flex gap-2">
        {(['7', '30', '90'] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
            style={{
              background: range === r ? 'var(--accent-primary)' : 'var(--bg-card)',
              color: range === r ? 'white' : 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            {r} Hari
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Pendapatan" value={formatCurrency(totalRevenue)} icon={<TrendingUp size={20} className="text-green-600" />} iconBg="bg-green-50" />
        <StatCard title="Omzet Bulan Ini" value={formatCurrency(monthlyRevenue)} icon={<TrendingUp size={20} className="text-blue-600" />} iconBg="bg-blue-50" />
        <StatCard title="Total Transaksi" value={totalTransactions} icon={<Package size={20} className="text-purple-600" />} iconBg="bg-purple-50" />
        <StatCard title="Rata-rata/Hari" value={formatCurrency(avgPerDay)} icon={<Users size={20} className="text-amber-600" />} iconBg="bg-amber-50" />
      </div>

      {/* Sales Chart */}
      <div className="card p-5">
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Grafik Penjualan</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={salesData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12 }}
            />
            <Legend />
            <Bar dataKey="total" fill="#2563eb" name="Pendapatan" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Top Products */}
        <div className="card p-5">
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Produk Terlaris</h3>
          {topProducts.length === 0 ? (
            <p className="text-center py-6 text-sm" style={{ color: 'var(--text-muted)' }}>Belum ada data</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.product_id} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: i < 3 ? '#2563eb' : '#94a3b8' }}>{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{p.product_name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.quantity} terjual</p>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>{formatCurrency(p.revenue)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Staff Sales */}
        <div className="card p-5">
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Omzet per Staff (Hari Ini)</h3>
          {staffSales.length === 0 ? (
            <p className="text-center py-6 text-sm" style={{ color: 'var(--text-muted)' }}>Belum ada data</p>
          ) : (
            <div className="space-y-3">
              {staffSales.map((s) => (
                <div key={s.user_id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{s.user_name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.transaction_count} transaksi</p>
                  </div>
                  <p className="font-bold" style={{ color: 'var(--accent-primary)' }}>{formatCurrency(s.total)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  TrendingUp, ShoppingCart, Package, AlertTriangle,
  Users, GitBranch, Coffee, Mic2, Tv, Clock, ChevronRight,
} from 'lucide-react'
import { StatCard } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDateTime } from '@/utils/format'
import { getTodayStats, getMonthlyRevenue, getTopProducts, getDailySales, getLowStockProducts, getLowStockAllBranches } from '@/services/reportService'
import { fetchTransactions } from '@/services/transactionService'
import { fetchDebts } from '@/services/debtService'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Owner / Manager dashboard
function OwnerDashboard() {
  const { selectedBranch } = useAuthStore()
  const branchId = selectedBranch?.id ?? ''

  const { data: todayStats } = useQuery({
    queryKey: ['today-stats', branchId],
    queryFn: () => getTodayStats(branchId),
    refetchInterval: 30_000,
  })

  const { data: monthlyRevenue = 0 } = useQuery({
    queryKey: ['monthly-revenue', branchId],
    queryFn: () => getMonthlyRevenue(branchId),
    refetchInterval: 60_000,
  })

  const { data: topProducts = [] } = useQuery({
    queryKey: ['top-products', branchId],
    queryFn: () => getTopProducts(branchId, 5),
  })

  const { data: salesChart = [] } = useQuery({
    queryKey: ['sales-chart', branchId],
    queryFn: () => getDailySales(branchId, 14),
  })

  const { data: lowStock = [] } = useQuery({
    queryKey: ['low-stock', branchId],
    queryFn: () => getLowStockProducts(branchId),
  })

  const { data: lowStockAllBranches = [] } = useQuery({
    queryKey: ['low-stock-all-branches'],
    queryFn: getLowStockAllBranches,
    refetchInterval: 60_000,
  })

  const { data: recentTransactions = [] } = useQuery({
    queryKey: ['recent-trx', branchId],
    queryFn: () => fetchTransactions(branchId),
    refetchInterval: 15_000,
  })

  const [stockModal, setStockModal] = useState(false)

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="page-subtitle">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pendapatan Hari Ini"
          value={formatCurrency(todayStats?.revenue ?? 0)}
          icon={<TrendingUp size={20} className="text-blue-600" />}
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Omzet Bulan Ini"
          value={formatCurrency(monthlyRevenue)}
          icon={<TrendingUp size={20} className="text-green-600" />}
          iconBg="bg-green-50"
        />
        <StatCard
          title="Transaksi Hari Ini"
          value={todayStats?.transactionCount ?? 0}
          icon={<ShoppingCart size={20} className="text-purple-600" />}
          iconBg="bg-purple-50"
        />
        <div
          className="stat-card cursor-pointer transition-all hover:shadow-md"
          onClick={() => setStockModal(true)}
        >
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-red-50">
              <AlertTriangle size={20} className="text-red-500" />
            </div>
            <ChevronRight size={16} className="text-red-300" />
          </div>
          <div>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{lowStock.length}</p>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Stok Menipis</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Ketuk untuk detail</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="card p-5">
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Grafik Pendapatan (14 Hari)
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={salesChart}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                color: 'var(--text-primary)',
              }}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#2563eb"
              strokeWidth={2}
              fill="url(#colorRevenue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Top Products */}
        <div className="card p-5">
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Produk Terlaris
          </h3>
          {topProducts.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
              Belum ada data
            </p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.product_id} className="flex items-center gap-3">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: i < 3 ? '#2563eb' : '#94a3b8' }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {p.product_name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {p.quantity} terjual
                    </p>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>
                    {formatCurrency(p.revenue)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="card p-5">
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Transaksi Terbaru
          </h3>
          {recentTransactions.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
              Belum ada transaksi
            </p>
          ) : (
            <div className="space-y-3">
              {recentTransactions.slice(0, 5).map((trx) => (
                <div key={trx.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {trx.code}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatDateTime(trx.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(trx.total_amount)}
                    </p>
                    <span
                      className={`text-xs font-medium ${
                        trx.status === 'paid' ? 'text-green-500' :
                        trx.status === 'debt' ? 'text-red-500' : 'text-yellow-500'
                      }`}
                    >
                      {trx.status === 'paid' ? 'Lunas' : trx.status === 'debt' ? 'Hutang' : 'Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <div className="card p-5 border-l-4 border-red-500">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-red-500" />
            <h3 className="font-semibold text-red-500">Stok Menipis</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {lowStock.slice(0, 8).map((p: any) => (
              <div key={p.id} className="p-2 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {p.name}
                </p>
                <p className="text-xs text-red-500 font-semibold">
                  Stok: {p.stock} {p.unit}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── STOK MENIPIS MODAL (Manager) ─── */}
      <Modal
        isOpen={stockModal}
        onClose={() => setStockModal(false)}
        title="Stok Menipis — Semua Cabang"
        size="lg"
      >
        <div className="max-h-[60vh] overflow-y-auto space-y-4">
          {lowStockAllBranches.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              <Package size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Semua stok aman</p>
              <p className="text-xs mt-1 opacity-60">Tidak ada produk dengan stok menipis</p>
            </div>
          ) : (
            lowStockAllBranches.map((branch: any) => (
              <div key={branch.branch_id} className="rounded-xl border p-4" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <GitBranch size={16} className="text-blue-500" />
                  <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    {branch.branch_name}
                  </h4>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">
                    {branch.products.length} produk
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {branch.products.map((p: any) => (
                    <div key={p.id} className="p-2 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {p.name}
                      </p>
                      <p className="text-xs text-red-500 font-semibold">
                        Stok: {p.stock} {p.unit}
                      </p>
                      {p.stock <= 0 && (
                        <span className="text-[10px] px-1 rounded bg-red-100 text-red-600">HABIS</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  )
}

// Staff dashboard
function StaffDashboard() {
  const { selectedBranch } = useAuthStore()
  const branchId = selectedBranch?.id ?? ''

  const { data: lowStock = [] } = useQuery({
    queryKey: ['low-stock-staff', branchId],
    queryFn: () => getLowStockProducts(branchId),
    refetchInterval: 30_000,
  })

  const { data: debts = [] } = useQuery({
    queryKey: ['debts-staff'],
    queryFn: fetchDebts,
    refetchInterval: 30_000,
  })

  const [stockModal, setStockModal] = useState(false)
  const totalDebt = (debts ?? []).reduce((sum, d) => sum + (d.remaining_amount ?? 0), 0)

  return (
    <div className="space-y-6 pt-4">
      {/* Quick menu */}
      <div className="grid grid-cols-2 gap-4">
        <Link to="/kasir" className="card card-hover p-6 text-center cursor-pointer">
          <ShoppingCart size={32} className="mx-auto mb-3 text-blue-500" />
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Kasir</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Mulai transaksi</p>
        </Link>
        <Link to="/hutang" className="card card-hover p-6 text-center cursor-pointer">
          <AlertTriangle size={32} className="mx-auto mb-3 text-amber-500" />
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Hutang</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total: {formatCurrency(totalDebt)}</p>
        </Link>
      </div>

      {/* Hutang Card - Global */}
      <Link to="/hutang" className="block card p-5 border-l-4 border-amber-500 cursor-pointer transition-all hover:shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            <h3 className="font-semibold text-amber-500">TOTAL HUTANG</h3>
          </div>
          <ChevronRight size={16} className="text-amber-300" />
        </div>
        <p className="text-2xl font-bold text-amber-600 mb-1">{formatCurrency(totalDebt)}</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {(debts ?? []).length} pelanggan • Semua lokasi
        </p>
      </Link>

      {/* Stok Menipis Card */}
      <div
        className="card p-5 border-l-4 border-red-500 cursor-pointer transition-all hover:shadow-md"
        onClick={() => setStockModal(true)}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            <h3 className="font-semibold text-red-500">STOK MENIPIS</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold text-red-500">{lowStock.length}</span>
            <ChevronRight size={16} className="text-red-300" />
          </div>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Ketuk untuk lihat detail di cabang ini
        </p>
      </div>

      {/* Warung banner */}
      <div
        className="card p-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #0891b2 100%)' }}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <Coffee size={24} className="text-white" />
            <Mic2 size={24} className="text-white" />
            <Tv size={24} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Warung Gadis</h2>
          <p className="text-sm text-blue-100">Ngopi • Nongkrong • Karaoke • Nobar</p>
        </div>
        {/* Decorative circles */}
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-10" style={{ background: 'white' }} />
        <div className="absolute -right-4 bottom-0 w-24 h-24 rounded-full opacity-10" style={{ background: 'white' }} />
      </div>

      {/* Shift info */}
      <div className="card p-5 flex items-center gap-4">
        <div className="p-3 rounded-xl bg-green-50">
          <Clock size={24} className="text-green-600" />
        </div>
        <div>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Status Shift</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            <Link to="/shift" className="text-blue-500 hover:underline">Kelola shift Anda</Link>
          </p>
        </div>
      </div>

      {/* ─── STOK MENIPIS MODAL (Staff) ─── */}
      <Modal
        isOpen={stockModal}
        onClose={() => setStockModal(false)}
        title={`Stok Menipis — ${selectedBranch?.name ?? 'Cabang'}`}
        size="md"
      >
        <div className="max-h-[60vh] overflow-y-auto space-y-2">
          {lowStock.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              <Package size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Semua stok aman</p>
              <p className="text-xs mt-1 opacity-60">Tidak ada produk dengan stok menipis</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lowStock.map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{
                    background: p.stock <= 0 ? 'rgba(239,68,68,0.05)' : 'var(--bg-primary)',
                    border: `1px solid ${p.stock <= 0 ? '#fca5a5' : 'var(--border-color)'}`,
                  }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {p.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Min: {p.min_stock} {p.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${p.stock <= 0 ? 'text-red-600' : 'text-amber-600'}`}>
                      {p.stock} {p.unit}
                    </p>
                    {p.stock <= 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-red-100 text-red-600 font-semibold">HABIS</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const isStaff = user?.role === 'staff'

  return (
    <div>
      {isStaff ? <StaffDashboard /> : <OwnerDashboard />}
    </div>
  )
}

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp, ShoppingCart, Package, AlertTriangle,
  Users, GitBranch, Coffee, Mic2, Tv, Clock,
} from 'lucide-react'
import { StatCard } from '@/components/ui/Card'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDateTime } from '@/utils/format'
import { getTodayStats, getMonthlyRevenue, getTopProducts, getDailySales, getLowStockProducts } from '@/services/reportService'
import { fetchTransactions } from '@/services/transactionService'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Owner / Manager dashboard
function OwnerDashboard() {
  const { selectedBranch } = useAuthStore()
  const branchId = selectedBranch?.id ?? ''

  const { data: todayStats } = useQuery({
    queryKey: ['today-stats', branchId],
    queryFn: () => getTodayStats(branchId),
    refetchInterval: 30_000,
    enabled: !!branchId,
  })

  const { data: monthlyRevenue = 0 } = useQuery({
    queryKey: ['monthly-revenue', branchId],
    queryFn: () => getMonthlyRevenue(branchId),
    refetchInterval: 60_000,
    enabled: !!branchId,
  })

  const { data: topProducts = [] } = useQuery({
    queryKey: ['top-products', branchId],
    queryFn: () => getTopProducts(branchId, 5),
    enabled: !!branchId,
  })

  const { data: salesChart = [] } = useQuery({
    queryKey: ['sales-chart', branchId],
    queryFn: () => getDailySales(branchId, 14),
    enabled: !!branchId,
  })

  const { data: lowStock = [] } = useQuery({
    queryKey: ['low-stock'],
    queryFn: () => getLowStockProducts(branchId),
    enabled: !!branchId,
  })

  const { data: recentTransactions = [] } = useQuery({
    queryKey: ['recent-trx', branchId],
    queryFn: () => fetchTransactions(branchId),
    refetchInterval: 15_000,
    enabled: !!branchId,
  })

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
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
        <StatCard
          title="Stok Menipis"
          value={lowStock.length}
          icon={<AlertTriangle size={20} className="text-red-500" />}
          iconBg="bg-red-50"
        />
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
            {lowStock.slice(0, 8).map((p: { id: string; name: string; stock: number; min_stock: number; unit: string }) => (
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
    </div>
  )
}

// Staff dashboard
function StaffDashboard() {
  const { user } = useAuthStore()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Halo, {user?.name}! 👋</h1>
        <p className="page-subtitle">
          {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Quick menu */}
      <div className="grid grid-cols-2 gap-4">
        <a href="/kasir" className="card card-hover p-6 text-center cursor-pointer">
          <ShoppingCart size={32} className="mx-auto mb-3 text-blue-500" />
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Kasir</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Mulai transaksi</p>
        </a>
        <a href="/hutang" className="card card-hover p-6 text-center cursor-pointer">
          <AlertTriangle size={32} className="mx-auto mb-3 text-amber-500" />
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Hutang</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Cek hutang pelanggan</p>
        </a>
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
            <a href="/shift" className="text-blue-500 hover:underline">Kelola shift Anda</a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()

  if (!user) return null

  if (user.role === 'staff') return <StaffDashboard />
  return <OwnerDashboard />
}

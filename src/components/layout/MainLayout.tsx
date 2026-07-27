import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar, MobileMenuButton } from './Sidebar'
import { Topbar } from './Topbar'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/kasir': 'Kasir',
  '/produk': 'Produk',
  '/kategori': 'Kategori',
  '/supplier': 'Supplier',
  '/stok': 'Manajemen Stok',
  '/transaksi': 'Transaksi',
  '/hutang': 'Hutang Pelanggan',
  '/laporan': 'Laporan',
  '/favorit': 'Favorit',
  '/shift': 'Shift',
  '/user': 'Manajemen User',
  '/cabang': 'Cabang',
  '/pengaturan': 'Pengaturan',
  '/backup': 'Backup & Restore',
  '/theme': 'Tema Aplikasi',
}

export const MainLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()

  const title = PAGE_TITLES[pathname] ?? 'WG POS'

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar
          title={title}
          onMenuClick={() => setMobileOpen(true)}
          mobileMenuButton={<MobileMenuButton onClick={() => setMobileOpen(true)} />}
        />

        <main
          className="flex-1 overflow-y-auto p-4 md:p-6"
          style={{ background: 'var(--bg-primary)' }}
        >
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

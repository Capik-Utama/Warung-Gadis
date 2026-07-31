import React, { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar, MobileMenuButton } from './Sidebar'
import { Topbar } from './Topbar'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/kasir': 'Kasir',
  '/produk': 'Produk',
  '/kategori': 'Kategori',
  '/stok': 'Manajemen Stok',
  '/transaksi': 'Transaksi',
  '/member': 'Member',
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

  const title = PAGE_TITLES[pathname] ?? 'Warung Gadis'

  // Handle viewport height changes on mobile (browser chrome show/hide)
  useEffect(() => {
    const handleResize = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [])

  return (
    <div 
      className="flex overflow-hidden w-full"
      style={{ 
        background: 'var(--bg-primary)',
        height: '100dvh', // Modern dynamic viewport height
      }}
    >
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar
          title={title}
          onMenuClick={() => setMobileOpen(true)}
          mobileMenuButton={<MobileMenuButton onClick={() => setMobileOpen(true)} />}
        />

        <main
          className="flex-1 overflow-y-auto p-4 md:p-6 w-full"
          style={{ 
            background: 'var(--bg-primary)',
            WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
          }}
        >
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

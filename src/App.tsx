import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { applyTheme } from '@/config/theme'
import { MainLayout } from '@/components/layout/MainLayout'

import LoginPage from '@/pages/auth/LoginPage'
import BranchSelectionPage from '@/pages/auth/BranchSelectionPage'
import SetupDatabase from '@/pages/SetupDatabase'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import KasirPage from '@/pages/kasir/KasirPage'
import ProdukPage from '@/pages/produk/ProdukPage'
import KategoriPage from '@/pages/kategori/KategoriPage'
import StokPage from '@/pages/stok/StokPage'
import TransaksiPage from '@/pages/transaksi/TransaksiPage'
import MemberPage from '@/pages/member/MemberPage'
import LaporanPage from '@/pages/laporan/LaporanPage'
import UserPage from '@/pages/user/UserPage'
import CabangPage from '@/pages/cabang/CabangPage'
import ShiftPage from '@/pages/shift/ShiftPage'
import PengaturanPage from '@/pages/pengaturan/PengaturanPage'
import SystemSettingsPage from '@/pages/pengaturan/SystemSettingsPage'
import ThemePage from '@/pages/pengaturan/ThemePage'
import BackupPage from '@/pages/backup/BackupPage'
import FavoritPage from '@/pages/favorit/FavoritPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireBranch({ children }: { children: React.ReactNode }) {
  // Branch selection is now optional for most pages
  // Only transaction pages will enforce branch selection
  return <>{children}</>
}

function App() {
  const { theme } = useThemeStore()
  useEffect(() => { applyTheme(theme) }, [theme])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/select-branch" element={<RequireAuth><BranchSelectionPage /></RequireAuth>} />
          <Route path="/setup-database" element={<SetupDatabase />} />
          <Route path="/" element={<RequireAuth><MainLayout /></RequireAuth>}>
            <Route index element={<DashboardPage />} />
            <Route path="kasir" element={<KasirPage />} />
            <Route path="produk" element={<ProdukPage />} />
            <Route path="kategori" element={<KategoriPage />} />
            <Route path="stok" element={<StokPage />} />
            <Route path="transaksi" element={<TransaksiPage />} />
            <Route path="member" element={<MemberPage />} />
            <Route path="hutang" element={<Navigate to="/member" replace />} />
            <Route path="laporan" element={<LaporanPage />} />
            <Route path="user" element={<UserPage />} />
            <Route path="cabang" element={<CabangPage />} />
            <Route path="shift" element={<ShiftPage />} />
            <Route path="favorit" element={<FavoritPage />} />
            <Route path="pengaturan" element={<PengaturanPage />} />
            <Route path="pengaturan/sistem" element={<SystemSettingsPage />} />
            <Route path="theme" element={<ThemePage />} />
            <Route path="backup" element={<BackupPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            fontFamily: 'Poppins, sans-serif',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: 'white' } },
          error: { iconTheme: { primary: '#ef4444', secondary: 'white' } },
        }}
      />
    </QueryClientProvider>
  )
}

export default App

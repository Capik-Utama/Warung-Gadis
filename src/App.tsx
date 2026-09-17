import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { applyTheme } from '@/config/theme'
import { supabase } from '@/config/supabase'
import { MainLayout } from '@/components/layout/MainLayout'

import LoginPage from '@/pages/auth/LoginPage'
import BranchSelectionPage from '@/pages/auth/BranchSelectionPage'
import RoleSelectionPage from '@/pages/auth/RoleSelectionPage'
import SetupDatabase from '@/pages/SetupDatabase'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import KasirPage from '@/pages/kasir/KasirPage'
import ProdukPage from '@/pages/produk/ProdukPage'
import KategoriPage from '@/pages/kategori/KategoriPage'
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
import HistoryPage from '@/pages/history/HistoryPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      refetchInterval: 15_000,
      refetchIntervalInBackground: true,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
})

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireAuditAccess({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'developer' && user.role !== 'manager') return <Navigate to="/" replace />
  return <>{children}</>
}

function RealtimeSync() {
  useEffect(() => {
    const channel = supabase
      .channel('warung-gadis-realtime')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        void queryClient.invalidateQueries()
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') console.warn('[Warung Gadis] Realtime channel error; polling remains active.')
      })
    return () => { void supabase.removeChannel(channel) }
  }, [])
  return null
}

function App() {
  const { theme } = useThemeStore()
  useEffect(() => { applyTheme(theme) }, [theme])

  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeSync />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/select-branch" element={<RequireAuth><BranchSelectionPage /></RequireAuth>} />
          <Route path="/select-role" element={<RequireAuth><RoleSelectionPage /></RequireAuth>} />
          <Route path="/setup-database" element={<SetupDatabase />} />
          <Route path="/" element={<RequireAuth><MainLayout /></RequireAuth>}>
            <Route index element={<DashboardPage />} />
            <Route path="kasir" element={<KasirPage />} />
            <Route path="produk" element={<ProdukPage />} />
            <Route path="kategori" element={<KategoriPage />} />
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
            <Route path="history" element={<RequireAuditAccess><HistoryPage /></RequireAuditAccess>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" toastOptions={{ style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '12px', fontFamily: 'Poppins, sans-serif', fontSize: '14px' }, success: { iconTheme: { primary: '#22c55e', secondary: 'white' } }, error: { iconTheme: { primary: '#ef4444', secondary: 'white' } } }} />
    </QueryClientProvider>
  )
}

export default App

import React from 'react'
import { Settings, Store, Bell, Shield, Info, Clock } from 'lucide-react'
import { useSettingsStore } from '@/store/settingsStore'

export default function PengaturanPage() {
  const { dailyResetHour, setDailyResetHour } = useSettingsStore()

  const hourOptions = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="space-y-5">
      <div><h1 className="page-title">Pengaturan</h1><p className="page-subtitle">Konfigurasi aplikasi</p></div>

      {/* Reset Pendapatan Harian */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-blue-50">
            <Clock size={20} className="text-blue-500" />
          </div>
          <div>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reset Pendapatan Harian</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Jam mulai perhitungan pendapatan harian
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {hourOptions.map((h) => (
            <button
              key={h}
              onClick={() => setDailyResetHour(h)}
              className="w-14 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: dailyResetHour === h ? 'var(--accent-primary)' : 'var(--bg-primary)',
                color: dailyResetHour === h ? 'white' : 'var(--text-secondary)',
                border: `1px solid ${dailyResetHour === h ? 'var(--accent-primary)' : 'var(--border-color)'}`,
              }}
            >
              {String(h).padStart(2, '0')}:00
            </button>
          ))}
        </div>

        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          {dailyResetHour === 0
            ? 'Pencatatan reset setiap tengah malam (00:00).'
            : `Pencatatan reset setiap pukul ${String(dailyResetHour).padStart(2, '0')}:00.`}
          {' '}Pendapatan "hari ini" dihitung sejak jam tersebut.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {[
          { icon: <Store size={20} />, title: 'Profil Warung', desc: 'Nama, alamat, dan kontak warung', bg: 'bg-blue-50', color: 'text-blue-500' },
          { icon: <Bell size={20} />, title: 'Notifikasi', desc: 'Atur alert stok dan transaksi', bg: 'bg-amber-50', color: 'text-amber-500' },
          { icon: <Shield size={20} />, title: 'Keamanan', desc: 'Password dan hak akses', bg: 'bg-green-50', color: 'text-green-500' },
          { icon: <Info size={20} />, title: 'Tentang Aplikasi', desc: 'Versi dan informasi Warung Gadis', bg: 'bg-purple-50', color: 'text-purple-500' },
        ].map((item, i) => (
          <div key={i} className="card card-hover p-5 flex items-center gap-4 cursor-pointer">
            <div className={`p-3 rounded-xl ${item.bg}`}><span className={item.color}>{item.icon}</span></div>
            <div>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="card p-5">
        <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Tentang Warung Gadis</h3>
        <div className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
          <p>Versi: 1.0.0</p>
          <p>Tagline: Ngopi • Nongkrong • Karaoke • Nobar</p>
          <p>©2026 Warung Gadis - By Capik</p>
        </div>
      </div>
    </div>
  )
}

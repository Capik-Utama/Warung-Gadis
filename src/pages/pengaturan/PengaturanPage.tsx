import React from 'react'
import { Link } from 'react-router-dom'
import { Store, Bell, Shield, Info, ChevronRight, Cpu } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

export default function PengaturanPage() {
  const { user } = useAuthStore()
  const isOwner = user?.role === 'developer' || user?.role === 'manager'

  const settingsItems = [
    {
      icon: <Store size={20} />,
      title: 'Profil Warung',
      desc: 'Nama, alamat, dan kontak warung',
      bg: 'bg-blue-50',
      color: 'text-blue-500',
      path: null,
    },
    {
      icon: <Bell size={20} />,
      title: 'Notifikasi',
      desc: 'Atur alert stok dan transaksi',
      bg: 'bg-amber-50',
      color: 'text-amber-500',
      path: null,
    },
    {
      icon: <Shield size={20} />,
      title: 'Keamanan',
      desc: 'Password dan hak akses',
      bg: 'bg-green-50',
      color: 'text-green-500',
      path: null,
    },
    {
      icon: <Cpu size={20} />,
      title: 'Sistem',
      desc: 'Jam Reset Pendapatan (Business Day)',
      bg: 'bg-indigo-50',
      color: 'text-indigo-500',
      path: '/pengaturan/sistem',
      badge: isOwner ? null : 'Owner Only',
    },
    {
      icon: <Info size={20} />,
      title: 'Tentang Aplikasi',
      desc: 'Versi dan informasi Warung Gadis',
      bg: 'bg-purple-50',
      color: 'text-purple-500',
      path: null,
    },
  ]

  return (
    <div className="space-y-5">
      <div><h1 className="page-title">Pengaturan</h1><p className="page-subtitle">Konfigurasi aplikasi</p></div>
      <div className="grid sm:grid-cols-2 gap-4">
        {settingsItems.map((item, i) => {
          const content = (
            <div className="card card-hover p-5 flex items-center gap-4 cursor-pointer">
              <div className={`p-3 rounded-xl ${item.bg}`}><span className={item.color}>{item.icon}</span></div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                      {item.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
              </div>
              {item.path && <ChevronRight size={16} className="text-gray-400" />}
            </div>
          )

          if (item.path) {
            return (
              <Link key={i} to={item.path} className="block">
                {content}
              </Link>
            )
          }

          return <div key={i}>{content}</div>
        })}
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

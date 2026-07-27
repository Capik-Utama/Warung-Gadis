import React from 'react'
import { Settings, Store, Bell, Shield, Info } from 'lucide-react'

export default function PengaturanPage() {
  return (
    <div className="space-y-5">
      <div><h1 className="page-title">Pengaturan</h1><p className="page-subtitle">Konfigurasi aplikasi</p></div>
      <div className="grid sm:grid-cols-2 gap-4">
        {[
          { icon: <Store size={20} />, title: 'Profil Warung', desc: 'Nama, alamat, dan kontak warung', bg: 'bg-blue-50', color: 'text-blue-500' },
          { icon: <Bell size={20} />, title: 'Notifikasi', desc: 'Atur alert stok dan transaksi', bg: 'bg-amber-50', color: 'text-amber-500' },
          { icon: <Shield size={20} />, title: 'Keamanan', desc: 'Password dan hak akses', bg: 'bg-green-50', color: 'text-green-500' },
          { icon: <Info size={20} />, title: 'Tentang Aplikasi', desc: 'Versi dan informasi WG POS', bg: 'bg-purple-50', color: 'text-purple-500' },
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
        <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Tentang WG POS</h3>
        <div className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
          <p>Versi: 1.0.0</p>
          <p>Tagline: Ngopi • Nongkrong • Karaoke • Nobar</p>
          <p>© 2025 Warung Gadis. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}

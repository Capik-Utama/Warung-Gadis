import React, { useState, useEffect } from 'react'
import { Clock, Save, RotateCcw, Info, Check } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { getResetHour, setResetHour, setResetHourFallback } from '@/services/systemSettingService'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

export default function SystemSettingsPage() {
  const { user } = useAuthStore()
  const [currentHour, setCurrentHour] = useState<number>(0)
  const [selectedHour, setSelectedHour] = useState<number>(0)
  const [saving, setSaving] = useState(false)
  const [_loaded, setLoaded] = useState(false)

  // Cek apakah user developer atau manager
  const canManage = user?.role === 'developer' || user?.role === 'manager'

  useEffect(() => {
    // Load jam reset saat ini
    async function load() {
      const hour = await getResetHour()
      setCurrentHour(hour)
      setSelectedHour(hour)
      setLoaded(true)
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await setResetHour(selectedHour)
      setResetHourFallback(selectedHour)
      setCurrentHour(selectedHour)
      toast.success(`Jam reset pendapatan berhasil diubah ke ${String(selectedHour).padStart(2, '0')}:00`)
    } catch (err) {
      console.error('[SystemSettings] Error saving reset hour:', err)
      toast.error('Gagal menyimpan pengaturan. Silakan coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setSelectedHour(0)
    toast('Direset ke default (00:00)')
  }

  // Jika tidak punya akses
  if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <Clock size={32} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Akses Ditolak</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Hanya Owner/Developer yang dapat mengubah pengaturan sistem.</p>
      </div>
    )
  }

  // Generate opsi jam (0-23)
  const hourOptions = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="page-title">Pengaturan Sistem</h1>
        <p className="page-subtitle">Konfigurasi sistem Warung Gadis</p>
      </div>

      {/* Jam Reset Pendapatan */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-blue-50">
            <Clock size={22} className="text-blue-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Jam Reset Pendapatan
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Business Day — Menentukan kapan "hari baru" dimulai untuk semua laporan
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Status saat ini */}
          <div
            className="rounded-xl p-4 flex items-center justify-between"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
          >
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                Jam reset saat ini
              </p>
              <p className="text-2xl font-bold" style={{ color: 'var(--accent-primary)' }}>
                {String(currentHour).padStart(2, '0')}:00
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Hari bisnis:
              </p>
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {String(currentHour).padStart(2, '0')}:00 → {String((currentHour + 24 - 1) % 24).padStart(2, '0')}:59:59
              </p>
            </div>
          </div>

          {/* Info box */}
          <div className="flex gap-3 p-3 rounded-xl" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm" style={{ color: '#1e40af' }}>
              <p className="font-medium mb-1">Contoh penggunaan:</p>
              <ul className="space-y-0.5 text-xs opacity-80">
                <li>• <strong>00:00</strong> — Pendapatan dihitung dari tengah malam (default, tanggal kalender biasa)</li>
                <li>• <strong>08:00</strong> — Pendapatan hari ini = 08:00 hari ini sampai 07:59:59 besok</li>
                <li>• <strong>20:00</strong> — Pendapatan hari ini = 20:00 hari ini sampai 19:59:59 besok</li>
              </ul>
            </div>
          </div>

          {/* Selector jam */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Pilih jam reset:
            </label>
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">
              {hourOptions.map((hour) => (
                <button
                  key={hour}
                  onClick={() => setSelectedHour(hour)}
                  className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    selectedHour === hour
                      ? 'bg-blue-500 text-white shadow-md scale-105'
                      : 'hover:bg-blue-50'
                  }`}
                  style={{
                    color: selectedHour === hour ? 'white' : 'var(--text-secondary)',
                    background: selectedHour === hour ? '#3b82f6' : 'var(--bg-primary)',
                    border: selectedHour === hour ? 'none' : '1px solid var(--border-color)',
                  }}
                >
                  {String(hour).padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div
            className="rounded-xl p-4"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
          >
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              Preview — Jika dipilih {String(selectedHour).padStart(2, '0')}:00:
            </p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Mulai: {String(selectedHour).padStart(2, '0')}:00 hari ini
                </span>
              </div>
              <span style={{ color: 'var(--text-muted)' }}>→</span>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Selesai: {String((selectedHour + 24 - 1) % 24).padStart(2, '0')}:59:59 besok
                </span>
              </div>
            </div>
            {selectedHour !== currentHour && (
              <p className="text-xs mt-2 font-medium" style={{ color: '#f59e0b' }}>
                ⚠ Ada perubahan yang belum disimpan
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSave}
              disabled={saving || selectedHour === currentHour}
              icon={<Save size={16} />}
            >
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </Button>
            <Button
              variant="secondary"
              onClick={handleReset}
              icon={<RotateCcw size={16} />}
            >
              Reset ke Default (00:00)
            </Button>
          </div>
        </div>
      </div>

      {/* Dampak perubahan */}
      <div className="card p-6">
        <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          Pengaturan ini mempengaruhi:
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            'Dashboard — Pemasukan Hari Ini',
            'Laporan — Grafik Penjualan',
            'Laporan — Omzet per Staff',
            'Laporan — Produk Terlaris',
            'Laporan — Export CSV',
            'Dashboard — Pendapatan Staff',
            'Shift — Laporan Harian',
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 py-1.5 px-3 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
              <Check size={14} className="text-green-500 flex-shrink-0" />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

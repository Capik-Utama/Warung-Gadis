import { supabase } from '@/config/supabase'

export interface SystemSetting {
  id: string
  setting_key: string
  setting_value: string
  description: string | null
  created_at: string
  updated_at: string
}

// Default jam reset pendapatan (00:00 = tanggal kalender biasa)
const DEFAULT_RESET_HOUR = 0

/**
 * Mengambil nilai jam reset pendapatan dari Supabase.
 * Jika belum ada, mengembalikan default (0 = 00:00).
 */
export async function getResetHour(): Promise<number> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'reset_hour')
    .single()

  if (error) {
    // Jika gagal (tabel belum ada atau error lain), coba ambil dari localStorage
    const fallback = getResetHourFallback()
    if (error.code !== 'PGRST116') { // PGRST116 cuma berarti data kosong, bukan error sistem
      console.warn('[systemSettingService] Gagal mengambil dari database, menggunakan fallback:', error)
    }
    return fallback
  }

  const hour = parseInt(data.setting_value, 10)
  return isNaN(hour) ? DEFAULT_RESET_HOUR : hour
}

/**
 * Menyimpan jam reset pendapatan ke Supabase.
 * @param hour - Jam (0-23, format 24 jam)
 */
export async function setResetHour(hour: number): Promise<void> {
  if (hour < 0 || hour > 23) {
    throw new Error('Jam reset harus antara 0-23')
  }

  const { error } = await supabase
    .from('system_settings')
    .upsert({
      setting_key: 'reset_hour',
      setting_value: String(hour),
      description: 'Jam reset pendapatan harian (0-23). Default 0 = 00:00 (tanggal kalender).',
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'setting_key',
    })


  if (error) {
    // Simpan di localStorage sebagai fallback untuk semua jenis error (tabel hilang, RLS, dll)
    // agar user tetap bisa menggunakan aplikasi meskipun database bermasalah
    console.warn('[systemSettingService] Gagal menyimpan ke database, menggunakan localStorage fallback:', error)
    localStorage.setItem('warung_gadis_reset_hour', String(hour))
    
    // Kita tidak melempar error di sini agar UI menganggapnya berhasil (karena sudah tersimpan di lokal)
    return
  }
}

/**
 * Mengambil jam reset dari localStorage sebagai fallback jika Supabase belum siap.
 */
export function getResetHourFallback(): number {
  const stored = localStorage.getItem('warung_gadis_reset_hour')
  if (stored !== null) {
    const hour = parseInt(stored, 10)
    if (!isNaN(hour) && hour >= 0 && hour <= 23) return hour
  }
  return DEFAULT_RESET_HOUR
}

/**
 * Menyimpan jam reset ke localStorage sebagai fallback.
 */
export function setResetHourFallback(hour: number): void {
  localStorage.setItem('warung_gadis_reset_hour', String(hour))
}

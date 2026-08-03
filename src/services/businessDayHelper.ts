/**
 * Business Day Helper - Warung Gadis POS
 * ========================================
 * Helper function pusat yang menghitung batas waktu "hari bisnis" (business day)
 * berdasarkan jam reset pendapatan yang diatur di Settings → Sistem.
 *
 * Semua laporan harian (Dashboard, Omzet, Penjualan, Grafik, Rekap, Export)
 * HARUS menggunakan fungsi-fungsi dari file ini agar konsisten.
 *
 * Contoh:
 * - Jika resetHour = 0 → hari ini = 00:00 hari ini sampai 23:59:59 hari ini
 * - Jika resetHour = 8 → hari ini = 08:00 hari ini sampai 07:59:59 besok
 * - Jika resetHour = 20 → hari ini = 20:00 hari ini sampai 19:59:59 besok
 */

import { getResetHour } from './systemSettingService'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

/**
 * Menghitung batas waktu business day untuk "hari ini".
 *
 * @param resetHour - Jam reset (0-23), diambil dari Supabase
 * @returns Object dengan `from` (awal) dan `to` (akhir) business day hari ini
 */
export function getBusinessDayBounds(resetHour: number): { from: string; to: string } {
  const now = new Date()

  // Base start = tanggal kalender hari ini pada jam reset
  const from = new Date(now)
  from.setHours(resetHour, 0, 0, 0)

  // Jika sekarang sebelum jam reset, business day aktif dimulai kemarin
  if (now < from) {
    from.setDate(from.getDate() - 1)
  }

  // Batas atas eksklusif: awal business day berikutnya
  const to = new Date(from.getTime() + ONE_DAY_MS)

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  }
}

/**
 * Menghitung batas waktu business day untuk tanggal tertentu.
 * Berguna untuk grafik harian yang perlu grouping.
 *
 * @param dateStr - Tanggal dalam format 'YYYY-MM-DD'
 * @param resetHour - Jam reset (0-23)
 * @returns Object dengan `from` dan `to` untuk tanggal tersebut
 */
export function getBusinessDayBoundsForDate(dateStr: string, resetHour: number): { from: string; to: string } {
  const [year, month, day] = dateStr.split('-').map(Number)
  const from = new Date(year, month - 1, day, resetHour, 0, 0, 0)
  const to = new Date(from.getTime() + ONE_DAY_MS)

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  }
}

/**
 * Menghasilkan array label tanggal yang sesuai dengan business day.
 * Setiap label merepresentasikan satu "hari bisnis".
 *
 * @param days - Jumlah hari ke belakang
 * @param resetHour - Jam reset (0-23)
 * @returns Array string tanggal (YYYY-MM-DD) dari lama ke baru
 */
export function getBusinessDayLabels(days: number, resetHour = 0): string[] {
  if (days <= 0) return []

  const labels: string[] = []
  const todayBounds = getBusinessDayBounds(resetHour)
  const todayBusinessStart = new Date(todayBounds.from)

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(todayBusinessStart)
    d.setDate(d.getDate() - i)
    // Label adalah tanggal kalender di mana business day dimulai
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    labels.push(label)
  }

  return labels
}

/**
 * Mengelompokkan timestamp ke business day yang sesuai.
 * Digunakan untuk grouping data transaksi/debt payments per hari bisnis.
 *
 * @param isoTimestamp - ISO timestamp (dari created_at)
 * @param resetHour - Jam reset (0-23)
 * @returns Label tanggal business day (YYYY-MM-DD)
 */
export function getBusinessDayLabel(isoTimestamp: string, resetHour: number): string {
  const date = new Date(isoTimestamp)
  const hour = date.getHours()

  // Jika jam timestamp < jam reset, maka masuk ke business day sebelumnya
  const businessDate = new Date(date)
  if (hour < resetHour) {
    businessDate.setDate(businessDate.getDate() - 1)
  }

  return `${businessDate.getFullYear()}-${String(businessDate.getMonth() + 1).padStart(2, '0')}-${String(businessDate.getDate()).padStart(2, '0')}`
}

/**
 * Query builder helper: membuat filter `gte` dan `lt` untuk Supabase
 * berdasarkan business day hari ini.
 *
 * @param resetHour - Jam reset (0-23)
 * @returns Object dengan `gte` dan `lt` yang bisa langsung dipakai di Supabase query
 */
export function getBusinessDayFilter(resetHour: number): { gte: string; lt: string } {
  const bounds = getBusinessDayBounds(resetHour)
  return {
    gte: bounds.from,
    lt: bounds.to,
  }
}

/**
 * Mengambil jam reset dari Supabase dan mengembalikan bounds hari ini.
 * Ini adalah fungsi utama yang dipakai oleh semua layanan laporan.
 */
export async function getTodayBusinessDayBounds(): Promise<{ from: string; to: string }> {
  const resetHour = await getResetHour()
  return getBusinessDayBounds(resetHour)
}

/**
 * Mengambil jam reset dan membuat filter Supabase untuk hari ini.
 */
export async function getTodayBusinessDayFilter(): Promise<{ gte: string; lt: string }> {
  const resetHour = await getResetHour()
  return getBusinessDayFilter(resetHour)
}

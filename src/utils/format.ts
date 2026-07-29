export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num)
}

export function formatDate(date: string | Date, format = 'dd MMM yyyy'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '-'
  const pad = (n: number) => String(n).padStart(2, '0')
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des']
  if (format === 'dd MMM yyyy') {
    return `${pad(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()}`
  }
  if (format === 'dd/MM/yyyy') {
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
  }
  if (format === 'HH:mm') {
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  if (format === 'dd MMM yyyy HH:mm') {
    return `${pad(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  return d.toLocaleDateString('id-ID')
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, 'dd MMM yyyy HH:mm')
}

export function generateCode(prefix = 'TRX'): string {
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2)
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const rand = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, '0')
  return `${prefix}${year}${month}${day}${rand}`
}

export function truncate(str: string, len = 30): string {
  if (str.length <= len) return str
  return str.slice(0, len) + '…'
}

export function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay = 300,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function parseRupiahInput(value: string): number {
  return parseInt(value.replace(/\D/g, ''), 10) || 0
}

/**
 * Mengembalikan ISO string waktu mulai "hari kerja" saat ini
 * berdasarkan jam reset yang dikonfigurasi.
 *
 * Contoh: resetHour = 6
 *   - Pukul 05:30 → hari kerja dimulai pukul 06:00 kemarin
 *   - Pukul 10:00 → hari kerja dimulai pukul 06:00 hari ini
 */
export function getDayStartISO(resetHour = 0): string {
  const now = new Date()
  const start = new Date(now)
  start.setHours(resetHour, 0, 0, 0)
  if (now.getHours() < resetHour) {
    start.setDate(start.getDate() - 1)
  }
  return start.toISOString()
}

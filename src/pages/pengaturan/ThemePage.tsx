import React from 'react'
import { useThemeStore } from '@/store/themeStore'
import { THEME_META } from '@/config/theme'
import { Check } from 'lucide-react'

export default function ThemePage() {
  const { theme, setTheme } = useThemeStore()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Tema Aplikasi</h1>
        <p className="page-subtitle">Pilih tampilan yang Anda sukai</p>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {THEME_META.map((t) => (
          <button
            key={t.key}
            onClick={() => setTheme(t.key)}
            className="card p-5 text-left transition-all hover:shadow-soft relative"
            style={{
              borderColor: theme === t.key ? 'var(--accent-primary)' : 'var(--border-color)',
              borderWidth: theme === t.key ? 2 : 1,
            }}
          >
            {theme === t.key && (
              <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-primary)' }}>
                <Check size={12} className="text-white" />
              </div>
            )}
            <ThemePreview themeKey={t.key} />
            <p className="font-semibold mt-3" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

const ThemePreview: React.FC<{ themeKey: string }> = ({ themeKey }) => {
  const previews: Record<string, { bg: string; sidebar: string; card: string; accent: string }> = {
    'blue-white': { bg: '#f8fafc', sidebar: '#1e40af', card: '#ffffff', accent: '#2563eb' },
    'blue-black': { bg: '#0a0f1e', sidebar: '#0d1526', card: '#1a2236', accent: '#3b82f6' },
    'white-black': { bg: '#f9fafb', sidebar: '#111827', card: '#ffffff', accent: '#111827' },
  }
  const p = previews[themeKey] ?? previews['blue-white']

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: p.bg, height: 100, display: 'flex' }}>
      <div style={{ width: 30, background: p.sidebar }} />
      <div style={{ flex: 1, padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ height: 12, background: p.accent, borderRadius: 4, width: '60%' }} />
        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          <div style={{ flex: 1, background: p.card, borderRadius: 6 }} />
          <div style={{ flex: 1, background: p.card, borderRadius: 6 }} />
        </div>
      </div>
    </div>
  )
}

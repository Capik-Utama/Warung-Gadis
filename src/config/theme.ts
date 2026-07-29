import type { ThemeKey } from '@/types'

export const THEMES: Record<ThemeKey, Record<string, string>> = {
  'blue-white': {
    '--bg-primary': '#f8fafc',
    '--bg-secondary': '#ffffff',
    '--bg-card': '#ffffff',
    '--bg-sidebar': '#1e40af',
    '--bg-topbar': '#ffffff',
    '--text-primary': '#0f172a',
    '--text-secondary': '#64748b',
    '--text-muted': '#94a3b8',
    '--text-sidebar': '#ffffff',
    '--border-color': '#e2e8f0',
    '--accent-primary': '#2563eb',
    '--accent-secondary': '#06b6d4',
    '--accent-hover': '#1d4ed8',
    '--shadow-color': 'rgba(0,0,0,0.08)',
    '--success': '#22c55e',
    '--warning': '#f59e0b',
    '--danger': '#ef4444',
    '--info': '#3b82f6',
    '--glass-bg': 'rgba(255,255,255,0.8)',
    '--glass-border': 'rgba(255,255,255,0.3)',
  },
  'blue-black': {
    '--bg-primary': '#0a0f1e',
    '--bg-secondary': '#111827',
    '--bg-card': '#1a2236',
    '--bg-sidebar': '#0d1526',
    '--bg-topbar': '#111827',
    '--text-primary': '#f1f5f9',
    '--text-secondary': '#94a3b8',
    '--text-muted': '#64748b',
    '--text-sidebar': '#e2e8f0',
    '--border-color': '#1e3a5f',
    '--accent-primary': '#3b82f6',
    '--accent-secondary': '#22d3ee',
    '--accent-hover': '#2563eb',
    '--shadow-color': 'rgba(59,130,246,0.1)',
    '--success': '#4ade80',
    '--warning': '#fbbf24',
    '--danger': '#f87171',
    '--info': '#60a5fa',
    '--glass-bg': 'rgba(17,24,39,0.8)',
    '--glass-border': 'rgba(59,130,246,0.2)',
  },
  'white-black': {
    '--bg-primary': '#f9fafb',
    '--bg-secondary': '#ffffff',
    '--bg-card': '#ffffff',
    '--bg-sidebar': '#111827',
    '--bg-topbar': '#ffffff',
    '--text-primary': '#111827',
    '--text-secondary': '#6b7280',
    '--text-muted': '#9ca3af',
    '--text-sidebar': '#f9fafb',
    '--border-color': '#e5e7eb',
    '--accent-primary': '#111827',
    '--accent-secondary': '#374151',
    '--accent-hover': '#374151',
    '--shadow-color': 'rgba(0,0,0,0.06)',
    '--success': '#16a34a',
    '--warning': '#d97706',
    '--danger': '#dc2626',
    '--info': '#2563eb',
    '--glass-bg': 'rgba(255,255,255,0.9)',
    '--glass-border': 'rgba(0,0,0,0.08)',
  },
}

export const THEME_META: Array<{ key: ThemeKey; name: string; desc: string }> = [
  { key: 'blue-white', name: 'Blue White', desc: 'Clean & Fresh' },
  { key: 'blue-black', name: 'Blue Black', desc: 'Dark & Elegant' },
  { key: 'white-black', name: 'White Black', desc: 'Minimal & Pro' },
]

export function applyTheme(key: ThemeKey) {
  try {
    const vars = THEMES[key]
    const root = document.documentElement
    if (root && root.style) {
      Object.entries(vars).forEach(([k, v]) => {
        try {
          root.style.setProperty(k, v)
        } catch (e) {
          console.warn(`Failed to set CSS variable ${k}:`, e)
        }
      })
      root.setAttribute('data-theme', key)
    }
    
    // Try to save to localStorage with error handling
    try {
      localStorage.setItem('wg-theme', key)
    } catch (e) {
      // localStorage might be disabled (private mode, quota exceeded, etc.)
      console.warn('localStorage not available:', e)
    }
  } catch (e) {
    console.error('Error applying theme:', e)
  }
}

export function getStoredTheme(): ThemeKey {
  try {
    const stored = localStorage.getItem('wg-theme')
    if (stored && (stored === 'blue-white' || stored === 'blue-black' || stored === 'white-black')) {
      return stored as ThemeKey
    }
  } catch (e) {
    // localStorage might be disabled (private mode, quota exceeded, etc.)
    console.warn('localStorage not available:', e)
  }
  return 'blue-white'
}

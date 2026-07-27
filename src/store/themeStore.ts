import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ThemeKey } from '@/types'
import { applyTheme, getStoredTheme } from '@/config/theme'

interface ThemeStore {
  theme: ThemeKey
  setTheme: (key: ThemeKey) => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: getStoredTheme(),
      setTheme: (key) => {
        applyTheme(key)
        set({ theme: key })
      },
    }),
    { name: 'wg-theme' },
  ),
)

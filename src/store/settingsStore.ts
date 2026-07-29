import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsStore {
  /** Jam reset pencatatan pendapatan harian (0–23). Default: 0 (tengah malam). */
  dailyResetHour: number
  setDailyResetHour: (hour: number) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      dailyResetHour: 0,
      setDailyResetHour: (hour) => set({ dailyResetHour: Math.max(0, Math.min(23, hour)) }),
    }),
    { name: 'wg-settings' },
  ),
)

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ThemeMode, ViewMode } from '@renderer/utils/constants'
import { THEME_MODES, VIEW_MODES } from '@renderer/utils/constants'

interface AppState {
  theme: ThemeMode
  viewMode: ViewMode
  isLoading: boolean
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  setViewMode: (mode: ViewMode) => void
  setLoading: (loading: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: THEME_MODES.LIGHT,
      viewMode: VIEW_MODES.LIST,
      isLoading: false,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === THEME_MODES.LIGHT ? THEME_MODES.DARK : THEME_MODES.LIGHT
        })),
      setViewMode: (viewMode) => set({ viewMode }),
      setLoading: (isLoading) => set({ isLoading })
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({ theme: state.theme, viewMode: state.viewMode })
    }
  )
)

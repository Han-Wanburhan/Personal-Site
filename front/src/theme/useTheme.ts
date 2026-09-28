import { createContext, useContext } from 'react'

import type { Mode, PaletteId } from './palettes'

export interface ThemeValue {
  mode: Mode
  palette: PaletteId
  setMode: (mode: Mode) => void
  toggleMode: () => void
  setPalette: (palette: PaletteId) => void
}

export const ThemeContext = createContext<ThemeValue | null>(null)

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}

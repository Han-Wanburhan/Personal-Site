import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react'

import { DEFAULT_PALETTE, isPaletteId, type Mode, type PaletteId } from './palettes'
import { ThemeContext } from './useTheme'

// Keys are also read by the inline script in index.html (prevents a flash of the wrong theme).
const MODE_KEY = 'passbook.theme'
const PALETTE_KEY = 'passbook.palette'

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // storage blocked: the choice just won't be remembered
  }
}

function storedMode(): Mode | null {
  const m = read(MODE_KEY)
  return m === 'light' || m === 'dark' ? m : null
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>(() => storedMode() ?? (darkQuery().matches ? 'dark' : 'light'))
  const [palette, setPaletteState] = useState<PaletteId>(() => {
    const p = read(PALETTE_KEY)
    return isPaletteId(p) ? p : DEFAULT_PALETTE
  })

  // Layout effect so the attributes are set before children read CSS variables.
  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.theme = mode
    root.dataset.palette = palette
  }, [mode, palette])

  // Follow the OS setting until the user picks a mode themselves.
  useEffect(() => {
    const mq = darkQuery()
    const onChange = () => {
      if (storedMode() === null) setModeState(mq.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const setMode = (m: Mode) => {
    write(MODE_KEY, m)
    setModeState(m)
  }
  const setPalette = (p: PaletteId) => {
    write(PALETTE_KEY, p)
    setPaletteState(p)
  }

  return (
    <ThemeContext.Provider
      value={{ mode, palette, setMode, setPalette, toggleMode: () => setMode(mode === 'dark' ? 'light' : 'dark') }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

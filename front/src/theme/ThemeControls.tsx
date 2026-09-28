import { useEffect, useRef, useState } from 'react'

import { PALETTES } from './palettes'
import { useTheme } from './useTheme'

// Palette picker (popover) + quick light/dark toggle.
const POP_WIDTH = 300
const EDGE = 16 // keep the popover this far from the screen edges

export function ThemeControls() {
  const { mode, palette, setMode, toggleMode, setPalette } = useTheme()
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const open = pos !== null

  // Place the popover under the buttons, right-aligned, but clamped inside the
  // screen so it never runs off the left edge on a phone.
  const openPop = () => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    const width = Math.min(POP_WIDTH, window.innerWidth - EDGE * 2)
    const left = Math.max(EDGE, Math.min(r.right - width, window.innerWidth - width - EDGE))
    setPos({ top: r.bottom + 8, left, width })
  }

  useEffect(() => {
    if (!open) return
    const close = () => setPos(null)
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, { passive: true })
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close)
    }
  }, [open])

  return (
    <div className="theme-tools" ref={ref}>
      <button
        type="button"
        className="icon-btn"
        aria-label="Choose color theme"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? setPos(null) : openPop())}
      >
        <span className="palette-dot" />
      </button>
      <button
        type="button"
        className="icon-btn"
        aria-label={mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        title={mode === 'dark' ? 'Light theme' : 'Dark theme'}
        onClick={toggleMode}
      >
        {mode === 'dark' ? <MoonIcon /> : <SunIcon />}
      </button>

      {pos && (
        <div className="theme-pop" role="dialog" aria-label="Appearance" style={pos}>
          <h3>Appearance</h3>
          <div className="seg" role="group" aria-label="Mode">
            {(['light', 'dark'] as const).map((m) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
                {m === 'light' ? 'Light' : 'Dark'}
              </button>
            ))}
          </div>
          <div className="eyebrow">Color theme</div>
          <div className="pals" role="radiogroup" aria-label="Color theme">
            {PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                className="pal"
                aria-checked={palette === p.id}
                onClick={() => setPalette(p.id)}
              >
                <span className="swatch">
                  {p.swatch.map((c) => (
                    <i key={c} style={{ background: c }} />
                  ))}
                </span>
                <span>
                  <b>{p.name}</b>
                  <small>{p.description}</small>
                </span>
                <span className="pal-check">✓</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
    </svg>
  )
}

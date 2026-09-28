import { useEffect, useRef } from 'react'

import { useTheme } from '../theme/useTheme'

// Banknote-style security pattern for the login panel. Color comes from --guil.
export function Guilloche() {
  const ref = useRef<HTMLCanvasElement>(null)
  const { mode, palette } = useTheme()

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return

    const draw = () => {
      const r = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = r.width * dpr
      canvas.height = r.height * dpr
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(dpr, dpr)
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--guil').trim()
      ctx.lineWidth = 0.7

      // three nested hypotrochoid rosettes
      const cx = r.width * 0.78
      const cy = r.height * 0.42
      const R = Math.min(r.width, r.height) * 0.52
      for (let k = 0; k < 3; k++) {
        const Rr = R * (1 - k * 0.18)
        const rr = Rr * 0.31
        const d = Rr * 0.24
        ctx.beginPath()
        for (let t = 0; t <= Math.PI * 2 * 23; t += 0.02) {
          const x = cx + (Rr - rr) * Math.cos(t) + d * Math.cos(((Rr - rr) / rr) * t)
          const y = cy + (Rr - rr) * Math.sin(t) - d * Math.sin(((Rr - rr) / rr) * t)
          if (t === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }

      // wave band along the bottom
      for (let i = 0; i < 14; i++) {
        ctx.beginPath()
        for (let x = 0; x <= r.width; x += 4) {
          const y = r.height * 0.86 + i * 5 + Math.sin(x / 38 + i * 0.5) * 9
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
    }

    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [mode, palette])

  return <canvas ref={ref} aria-hidden="true" />
}

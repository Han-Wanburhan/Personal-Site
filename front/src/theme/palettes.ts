// Color palettes. Each one has a light and a dark set of the same tokens.
// The CSS for these lives in src/styles/themes.css; keep the two in sync.

export type Mode = 'light' | 'dark'

export type PaletteId = 'neutral' | 'mono' | 'earth' | 'sage' | 'ocean' | 'rose'

export interface Palette {
  id: PaletteId
  name: string
  description: string
  // Used only to draw the swatch in the theme picker.
  swatch: [panel: string, accent: string, darkPaper: string]
}

export const PALETTES: Palette[] = [
  { id: 'neutral', name: 'Neutral', description: 'Peach, greige and brown', swatch: ['#FFDBBB', '#664930', '#1A1410'] },
  { id: 'mono', name: 'Minimal', description: 'Black, white and grey only', swatch: ['#EFEFEC', '#161616', '#0F0F0F'] },
  { id: 'earth', name: 'Earth', description: 'Olive, sand and clay', swatch: ['#D9CFB4', '#5B6B34', '#171811'] },
  { id: 'sage', name: 'Sage', description: 'Soft green and white', swatch: ['#CFE0D3', '#4F7A64', '#111815'] },
  { id: 'ocean', name: 'Ocean', description: 'Deep blue and mist', swatch: ['#D3E2EF', '#245B8A', '#0E141B'] },
  { id: 'rose', name: 'Rose', description: 'Dusty pink and plum', swatch: ['#F0D3D3', '#8E4A55', '#1A1213'] },
]

export const DEFAULT_PALETTE: PaletteId = 'neutral'

export function isPaletteId(value: unknown): value is PaletteId {
  return PALETTES.some((p) => p.id === value)
}

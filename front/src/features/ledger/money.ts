// Money in the browser is kept as whole satang (integers), never as floats:
// 0.1 + 0.2 !== 0.3 in JavaScript, and those errors add up over a year.

import { formatMoney } from '../../lib/format'

// An amount the user may type: up to 10 digits, optionally 1–2 decimals.
export const AMOUNT_RE = /^\d{1,10}(\.\d{1,2})?$/

// "1284.5" → 128450
export function toSatang(amount: string): number {
  const [baht, frac = ''] = amount.split('.')
  return Number(baht) * 100 + Number((frac + '00').slice(0, 2))
}

// 128450 → "1,284.50"
export function formatSatang(satang: number): string {
  return formatMoney(satang / 100)
}

// Is this text a valid, positive amount?
export function isValidAmount(text: string): boolean {
  return AMOUNT_RE.test(text) && toSatang(text) > 0
}

// Removes commas and spaces people often type: "1,284.50 " → "1284.50"
export function cleanAmount(text: string): string {
  return text.replace(/[,\s]/g, '')
}

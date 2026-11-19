// Calendar helpers on plain strings ("2026-09", "2026-09-30"), no time zones involved.

import { MONTHS } from '../../lib/format'

const pad = (n: number) => String(n).padStart(2, '0')

const daysIn = (y: number, m: number) => new Date(y, m, 0).getDate() // m is 1-12

// "2026-09" → { from: "2026-09-01", to: "2026-09-30" }
export function monthRange(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return { from: `${ym}-01`, to: `${ym}-${pad(daysIn(y, m))}` }
}

// "2026-11" + 3 → "2027-02"
export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

// "2026-01-31" + 1 month → "2026-02-28": same day, or the month's last day if it is shorter
export function shiftDate(iso: string, months: number): string {
  const ym = shiftMonth(iso.slice(0, 7), months)
  const [y, m] = ym.split('-').map(Number)
  const day = Math.min(Number(iso.slice(8, 10)), daysIn(y, m))
  return `${ym}-${pad(day)}`
}

// Number of months from a to b, both "YYYY-MM": ("2026-11", "2027-02") → 3
export function monthsBetween(a: string, b: string): number {
  const [ay, am] = a.split('-').map(Number)
  const [by, bm] = b.split('-').map(Number)
  return (by - ay) * 12 + (bm - am)
}

// "2026-09" → "September 2026"
export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return `${MONTHS[m - 1]} ${y}`
}

// "2026-09" → "Sep 2026"
export function shortMonthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return `${MONTHS[m - 1].slice(0, 3)} ${y}`
}

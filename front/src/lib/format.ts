const money = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const whole = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

export const formatMoney = (n: number) => money.format(n)
export const formatWhole = (n: number) => whole.format(n)
export const formatPercent = (n: number) => `${n.toFixed(1)}%`

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// YYYY-MM-DD in Bangkok time (the backend stores dates in Asia/Bangkok).
export function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date())
}

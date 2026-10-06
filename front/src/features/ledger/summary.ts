// GET /api/summary?year= (mirrors back/internal/dto/summary.go)

import { useQuery } from '@tanstack/react-query'

import { api } from '../../lib/api'
import { toSatang } from './money'

export interface SummaryMonth {
  month: number // 1-12, 0 for the year total
  income: string // "45000.00"
  expense: string
  saved: string // may be negative: "-500.50"
  savings_rate: string | null // "30.7", null when there is no income
  transaction_count: number
}

export interface Summary {
  year: number
  months: SummaryMonth[] // always 12
  total: SummaryMonth
}

export const summaryKey = ['summary'] as const

export function useSummary(year: number, enabled = true) {
  return useQuery({
    queryKey: [...summaryKey, year],
    queryFn: () => api<Summary>(`/summary?year=${year}`),
    enabled,
  })
}

// Figures for display. Amounts come from exact strings via whole satang,
// so the numbers here are only ever used for formatting and percentages.
export interface MonthFigures {
  month: number
  income: number
  expense: number
  saved: number
  rate: number | null
  count: number
}

// "-500.50" → -500.5 (toSatang only handles unsigned amounts)
function baht(amount: string): number {
  return amount.startsWith('-') ? -toSatang(amount.slice(1)) / 100 : toSatang(amount) / 100
}

export function toFigures(m: SummaryMonth): MonthFigures {
  return {
    month: m.month,
    income: baht(m.income),
    expense: baht(m.expense),
    saved: baht(m.saved),
    rate: m.savings_rate === null ? null : Number(m.savings_rate),
    count: m.transaction_count,
  }
}

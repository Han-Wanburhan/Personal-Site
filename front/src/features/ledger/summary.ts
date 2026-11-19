// GET /api/summary?year= (mirrors back/internal/dto/summary.go)

import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { api } from '../../lib/api'
import type { TxnType } from './api'
import { toSignedSatang } from './money'

export interface SummaryMonth {
  month: number // 1-12, 0 for the year total
  income: string // "45000.00"
  expense: string
  saving: string // net, may be negative: "-500.50" = withdrew more than put in
  investment: string // net, may be negative
  left_over: string // income − expense − saving − investment
  savings_rate: string | null // (saving + investment) / income: "30.7", null when there is no income
  transaction_count: number
}

export interface Summary {
  year: number
  months: SummaryMonth[] // always 12
  total: SummaryMonth
}

export const summaryKey = ['summary'] as const // also covers ['summary', 'items', year]

export function useSummary(year: number, enabled = true) {
  return useQuery({
    queryKey: [...summaryKey, year],
    queryFn: () => api<Summary>(`/summary?year=${year}`),
    enabled,
  })
}

// ---------- per item: the yearly grid (GET /api/summary/items) ----------

export interface ItemYear {
  item_id: number
  item_name: string
  category_id: number
  category_name: string
  type: TxnType
  months: string[] // always 12, "0.00" for empty months
  total: string
}

export function useItemsSummary(year: number) {
  return useQuery({
    queryKey: [...summaryKey, 'items', year],
    queryFn: () => api<{ year: number; items: ItemYear[] }>(`/summary/items?year=${year}`),
    placeholderData: keepPreviousData, // keep the old year on screen while the next one loads
  })
}

// Figures for display. Amounts come from exact strings via whole satang,
// so the numbers here are only ever used for formatting and percentages.
export interface MonthFigures {
  month: number
  income: number
  expense: number
  saving: number
  investment: number
  put: number // saving + investment: money set aside this month
  leftOver: number
  rate: number | null
  count: number
}

const baht = (amount: string) => toSignedSatang(amount) / 100

export function toFigures(m: SummaryMonth): MonthFigures {
  return {
    month: m.month,
    income: baht(m.income),
    expense: baht(m.expense),
    saving: baht(m.saving),
    investment: baht(m.investment),
    put: (toSignedSatang(m.saving) + toSignedSatang(m.investment)) / 100,
    leftOver: baht(m.left_over),
    rate: m.savings_rate === null ? null : Number(m.savings_rate),
    count: m.transaction_count,
  }
}

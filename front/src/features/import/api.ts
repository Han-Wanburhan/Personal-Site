// Excel import. Mirrors back/internal/dto/import.go and POST /api/import.

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '../../lib/api'
import { refreshLedger, type TxnType } from '../ledger/api'

export const LAST_DAY = 0 // "day" 0 = last day of the month

export interface ImportSheet {
  name: string
  year: number // guessed from the name, 0 if none
  importable: boolean // has the หมวด / รายการ / months layout
}

export interface ImportItem {
  category: string
  type: TxnType
  item: string
  day: number
  total: string // sum over the chosen months
}

export interface ImportMonth {
  month: number
  income: string
  expense: string
  transaction_count: number
}

export interface ImportResult {
  sheet: string
  year: number
  from: number
  to: number
  applied: boolean
  categories_created: number
  items_created: number
  transactions: number
  months: ImportMonth[]
  items: ImportItem[]
}

export interface ImportInput {
  file: File
  sheet: string
  year: number
  from: number
  to: number
  days: Record<string, number> // item name -> day; missing = last day
  apply: boolean
}

function toForm({ file, sheet, year, from, to, days, apply }: ImportInput): FormData {
  const form = new FormData()
  form.append('file', file)
  form.append('sheet', sheet)
  form.append('year', String(year))
  form.append('from', String(from))
  form.append('to', String(to))
  form.append('days', JSON.stringify(days))
  form.append('apply', String(apply))
  return form
}

// Reads the sheet names of a workbook. Saves nothing.
export function useImportSheets() {
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api<ImportSheet[]>('/import/sheets', { method: 'POST', body: form })
    },
  })
}

// Preview (apply=false) changes nothing; apply=true saves and refreshes every list.
export function useImportExcel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ImportInput) => api<ImportResult>('/import', { method: 'POST', body: toForm(input) }),
    onSuccess: (res) => (res.applied ? refreshLedger(qc) : undefined),
  })
}

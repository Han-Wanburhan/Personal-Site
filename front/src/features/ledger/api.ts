// Types and TanStack Query hooks for categories, items and transactions.
// Mirrors back/internal/dto/{category,item,transaction}.go

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '../../lib/api'
import { summaryKey } from './summary'

export type TxnType = 'income' | 'expense'

export interface Category {
  id: number
  name: string
  type: TxnType
  is_active: boolean
}

export interface Item {
  id: number
  category_id: number
  category_name: string
  type: TxnType
  name: string
  is_active: boolean
}

export interface Transaction {
  id: number
  item_id: number
  item_name: string
  category_id: number
  category_name: string
  type: TxnType
  amount: string // "1284.50" (a string: exact, no float rounding)
  txn_date: string // "2026-09-28"
  note: string
}

export interface TransactionInput {
  item_id: number
  amount: string
  txn_date: string
  note: string
}

const keys = {
  categories: ['categories'] as const,
  items: ['items'] as const,
  transactions: ['transactions'] as const,
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })

// A transaction change affects both the lists and the yearly summary.
function refreshMoney(qc: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: keys.transactions }),
    qc.invalidateQueries({ queryKey: summaryKey }),
  ])
}

// ---------- queries ----------

export function useCategories() {
  return useQuery({ queryKey: keys.categories, queryFn: () => api<Category[]>('/categories') })
}

export function useItems() {
  return useQuery({ queryKey: keys.items, queryFn: () => api<Item[]>('/items') })
}

// from/to are YYYY-MM-DD, both inclusive.
export function useTransactions(from: string, to: string) {
  return useQuery({
    queryKey: [...keys.transactions, from, to],
    queryFn: () => api<Transaction[]>(`/transactions?from=${from}&to=${to}`),
    placeholderData: keepPreviousData, // keep showing the old month while the new one loads
  })
}

// ---------- mutations ----------

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; type: TxnType }) => api<Category>('/categories', json('POST', body)),
    onSuccess: (created) => {
      // show it in pickers right away, then refetch to be sure
      qc.setQueryData<Category[]>(keys.categories, (old) => [...(old ?? []), created])
      return qc.invalidateQueries({ queryKey: keys.categories })
    },
  })
}

export function useCreateItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ categoryId, name }: { categoryId: number; name: string }) =>
      api<Item>(`/categories/${categoryId}/items`, json('POST', { name })),
    onSuccess: (created) => {
      qc.setQueryData<Item[]>(keys.items, (old) => [...(old ?? []), created])
      return qc.invalidateQueries({ queryKey: keys.items })
    },
  })
}

export function useCreateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: TransactionInput) => api<Transaction>('/transactions', json('POST', body)),
    onSuccess: () => refreshMoney(qc),
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: TransactionInput & { id: number }) =>
      api<Transaction>(`/transactions/${id}`, json('PUT', body)),
    onSuccess: () => refreshMoney(qc),
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api<void>(`/transactions/${id}`, { method: 'DELETE' }),
    onSuccess: () => refreshMoney(qc),
  })
}

// Example data for the home page until the categories / transactions / summary
// endpoints exist. Replace with TanStack Query hooks when the API is ready.

export type TxnType = 'income' | 'expense'

export interface MonthSummary {
  month: number // 1-12
  income: number
  expense: number
}

export interface Txn {
  id: number
  date: string // YYYY-MM-DD
  type: TxnType
  category: string
  item: string
  note: string
  amount: number // always positive; sign comes from type
}

export const SAMPLE_YEAR = 2026
export const SAMPLE_CURRENT_MONTH = 9

export const sampleSummary: MonthSummary[] = [
  { month: 1, income: 45000, expense: 31200 },
  { month: 2, income: 45000, expense: 28900 },
  { month: 3, income: 52000, expense: 33400 },
  { month: 4, income: 45000, expense: 36100 },
  { month: 5, income: 45000, expense: 29800 },
  { month: 6, income: 48500, expense: 30500 },
  { month: 7, income: 45000, expense: 32700 },
  { month: 8, income: 45000, expense: 27600 },
  { month: 9, income: 51200, expense: 30950 },
]

// categories (with type) → items, same shape as the DB
export const sampleCategories: Record<TxnType, Record<string, string[]>> = {
  expense: {
    Food: ['Meals', 'Groceries', 'Coffee'],
    Transport: ['BTS / MRT', 'Grab', 'Fuel'],
    Housing: ['Rent', 'Electricity', 'Water', 'Internet'],
    Shopping: ['Clothes', 'Electronics'],
  },
  income: {
    Salary: ['Monthly salary', 'Bonus'],
    'Side income': ['Freelance', 'Interest'],
  },
}

export const sampleTxns: Txn[] = [
  { id: 5, date: '2026-09-26', type: 'expense', category: 'Food', item: 'Groceries', note: 'Big C', amount: 1284.5 },
  { id: 4, date: '2026-09-25', type: 'income', category: 'Side income', item: 'Freelance', note: 'Logo job', amount: 6200 },
  { id: 3, date: '2026-09-25', type: 'expense', category: 'Transport', item: 'BTS / MRT', note: 'Rabbit top-up', amount: 500 },
  { id: 2, date: '2026-09-24', type: 'expense', category: 'Housing', item: 'Electricity', note: 'MEA bill', amount: 1162.75 },
  { id: 1, date: '2026-09-23', type: 'expense', category: 'Food', item: 'Coffee', note: '', amount: 75 },
]

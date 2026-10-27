// The four kinds of money and how each one is shown.
// Mirrors back/internal/model/category.go.

import type { TxnType } from './api'
import { formatSatang, toSignedSatang } from './money'

export const TXN_TYPES: TxnType[] = ['expense', 'income', 'saving', 'investment']

export const TYPE_LABEL: Record<TxnType, string> = {
  expense: 'Expense',
  income: 'Income',
  saving: 'Saving',
  investment: 'Invest',
}

// CSS class for the type's colour (see .up / .down / .sv / .iv in app.css)
export const TYPE_CLASS: Record<TxnType, string> = {
  income: 'up',
  expense: 'down',
  saving: 'sv',
  investment: 'iv',
}

export const TYPE_EXAMPLE: Record<TxnType, { category: string; item: string }> = {
  expense: { category: 'e.g. Food', item: 'e.g. Coffee' },
  income: { category: 'e.g. Salary', item: 'e.g. Monthly salary' },
  saving: { category: 'e.g. Savings account', item: 'e.g. Emergency fund' },
  investment: { category: 'e.g. Funds', item: 'e.g. S&P 500 fund' },
}

// Savings and investments can go down: a withdrawal / a sale, stored as a negative amount.
export function canWithdraw(type: TxnType): boolean {
  return type === 'saving' || type === 'investment'
}

// How an amount reads in a list:
//   income +1,000 · expense −1,000 · saving +5,000 (deposit) / −5,000 (withdrawal)
export function amountText(type: TxnType, amount: string): string {
  const satang = toSignedSatang(amount)
  const sign = type === 'expense' ? '−' : satang < 0 ? '−' : '+'
  return sign + formatSatang(Math.abs(satang))
}

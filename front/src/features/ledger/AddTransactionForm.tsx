import { useState, type FormEvent } from 'react'

import { todayISO } from '../../lib/format'
import type { Txn, TxnType } from './sample'

interface Props {
  categories: Record<TxnType, Record<string, string[]>>
  onAdd: (txn: Omit<Txn, 'id'>) => void
  onInvalid: (message: string) => void
}

export function AddTransactionForm({ categories, onAdd, onInvalid }: Props) {
  const [type, setType] = useState<TxnType>('expense')
  const firstCategory = (t: TxnType) => Object.keys(categories[t])[0] ?? ''
  const [category, setCategory] = useState(() => firstCategory('expense'))
  const [item, setItem] = useState(() => categories.expense[firstCategory('expense')]?.[0] ?? '')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO)
  const [note, setNote] = useState('')

  const items = categories[type][category] ?? []

  const chooseType = (t: TxnType) => {
    const c = firstCategory(t)
    setType(t)
    setCategory(c)
    setItem(categories[t][c]?.[0] ?? '')
  }

  const chooseCategory = (c: string) => {
    setCategory(c)
    setItem(categories[type][c]?.[0] ?? '')
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const value = Number.parseFloat(amount.replace(/,/g, ''))
    if (!(value > 0)) {
      onInvalid('Enter an amount greater than 0')
      document.getElementById('amount')?.focus()
      return
    }
    if (!date) {
      onInvalid('Pick a date for this transaction')
      return
    }
    onAdd({ type, category, item, date, note: note.trim(), amount: Math.round(value * 100) / 100 })
    setAmount('')
    setNote('')
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Add transaction</h2>
      </div>
      <form className="add" onSubmit={onSubmit} noValidate>
        <div className="type-toggle" role="group" aria-label="Type">
          {(['expense', 'income'] as const).map((t) => (
            <button key={t} type="button" className={t} aria-pressed={type === t} onClick={() => chooseType(t)}>
              {t === 'expense' ? 'Expense' : 'Income'}
            </button>
          ))}
        </div>

        <div className="field">
          <label htmlFor="amount">Amount</label>
          <div className="amount">
            <span aria-hidden="true">฿</span>
            <input id="amount" className="input" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </div>

        <div className="two">
          <div className="field">
            <label htmlFor="category">Category</label>
            <select id="category" className="input" value={category} onChange={(e) => chooseCategory(e.target.value)}>
              {Object.keys(categories[type]).map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="item">Item</label>
            <select id="item" className="input" value={item} onChange={(e) => setItem(e.target.value)}>
              {items.map((i) => <option key={i}>{i}</option>)}
            </select>
          </div>
        </div>

        <div className="two">
          <div className="field">
            <label htmlFor="date">Date</label>
            <input id="date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="note">Note</label>
            <input id="note" className="input" placeholder="Optional" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>

        <button className="btn" type="submit">Save transaction</button>
      </form>
    </section>
  )
}

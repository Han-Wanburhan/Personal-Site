import { useState, type FormEvent } from 'react'

import { ApiError } from '../../lib/api'
import { todayISO } from '../../lib/format'
import {
  useCategories,
  useCreateCategory,
  useCreateItem,
  useCreateTransaction,
  useItems,
  type TxnType,
} from './api'
import { cleanAmount, isValidAmount } from './money'

const NEW = '__new' // select value that opens the "new category / new item" input

interface Props {
  onSaved: (message: string, txnDate: string) => void
}

export function NewTransactionForm({ onSaved }: Props) {
  const categoriesQ = useCategories()
  const itemsQ = useItems()
  const createCategory = useCreateCategory()
  const createItem = useCreateItem()
  const createTxn = useCreateTransaction()

  const [type, setType] = useState<TxnType>('expense')
  const [categoryPick, setCategoryPick] = useState('')
  const [itemPick, setItemPick] = useState('')
  const [newName, setNewName] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Only active categories/items of the chosen type appear in the pickers.
  const categories = (categoriesQ.data ?? []).filter((c) => c.type === type && c.is_active)
  const categoryId = categoryPick === NEW ? NEW : categories.some((c) => String(c.id) === categoryPick)
    ? categoryPick
    : String(categories[0]?.id ?? NEW)
  const items = (itemsQ.data ?? []).filter((i) => String(i.category_id) === categoryId && i.is_active)
  const itemId = categoryId === NEW
    ? ''
    : itemPick === NEW ? NEW : items.some((i) => String(i.id) === itemPick) ? itemPick : String(items[0]?.id ?? NEW)

  const addingCategory = categoryId === NEW
  const addingItem = !addingCategory && itemId === NEW

  const chooseType = (t: TxnType) => {
    setType(t)
    setCategoryPick('')
    setItemPick('')
    setNewName('')
  }

  const addCategory = () => {
    const name = newName.trim()
    if (!name) return setError('Type a name for the new category')
    setError(null)
    createCategory.mutate(
      { name, type },
      {
        onSuccess: (c) => {
          setCategoryPick(String(c.id))
          setItemPick(NEW) // a new category has no items yet
          setNewName('')
        },
        onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not add the category'),
      },
    )
  }

  const addItem = () => {
    const name = newName.trim()
    if (!name) return setError('Type a name for the new item')
    setError(null)
    createItem.mutate(
      { categoryId: Number(categoryId), name },
      {
        onSuccess: (i) => {
          setItemPick(String(i.id))
          setNewName('')
        },
        onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not add the item'),
      },
    )
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const value = cleanAmount(amount)
    if (addingCategory || addingItem || !itemId) {
      return setError('Pick a category and an item first (or add new ones)')
    }
    if (!isValidAmount(value)) {
      return setError('Enter an amount greater than 0, like 85 or 85.50')
    }
    if (!date) return setError('Pick a date')
    setError(null)

    createTxn.mutate(
      { item_id: Number(itemId), amount: value, txn_date: date, note: note.trim() },
      {
        onSuccess: (t) => {
          setAmount('')
          setNote('')
          onSaved(`Saved ${t.item_name} · ${t.amount}`, t.txn_date)
        },
        onError: (err) => setError(err instanceof ApiError ? err.message : "Couldn't save. Check that the API is running."),
      },
    )
  }

  const loading = categoriesQ.isPending || itemsQ.isPending

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Add transaction</h2>
      </div>
      <form className="add" onSubmit={onSubmit} noValidate>
        {error && (
          <div className="alert" role="alert">
            <span aria-hidden="true">●</span>
            <span>{error}</span>
          </div>
        )}

        <div className="type-toggle" role="group" aria-label="Type">
          {(['expense', 'income'] as const).map((t) => (
            <button key={t} type="button" className={t} aria-pressed={type === t} onClick={() => chooseType(t)}>
              {t === 'expense' ? 'Expense' : 'Income'}
            </button>
          ))}
        </div>

        <div className="field">
          <label htmlFor="new-category">Category</label>
          <select
            id="new-category"
            className="input"
            value={categoryId}
            disabled={loading}
            onChange={(e) => {
              setCategoryPick(e.target.value)
              setItemPick('')
              setNewName('')
            }}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
            <option value={NEW}>+ New category…</option>
          </select>
        </div>

        {addingCategory && (
          <div className="inline-add">
            <input
              id="new-category-name"
              className="input"
              placeholder={type === 'expense' ? 'e.g. Food' : 'e.g. Salary'}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
            />
            <button type="button" className="btn btn-ghost btn-sm" onClick={addCategory} disabled={createCategory.isPending}>
              Add category
            </button>
          </div>
        )}

        {!addingCategory && (
          <div className="field">
            <label htmlFor="new-item">Item</label>
            <select
              id="new-item"
              className="input"
              value={itemId}
              disabled={loading}
              onChange={(e) => {
                setItemPick(e.target.value)
                setNewName('')
              }}
            >
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
              <option value={NEW}>+ New item…</option>
            </select>
          </div>
        )}

        {addingItem && (
          <div className="inline-add">
            <input
              id="new-item-name"
              className="input"
              placeholder={type === 'expense' ? 'e.g. Coffee' : 'e.g. Monthly salary'}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem())}
            />
            <button type="button" className="btn btn-ghost btn-sm" onClick={addItem} disabled={createItem.isPending}>
              Add item
            </button>
          </div>
        )}

        <div className="field">
          <label htmlFor="new-amount">Amount</label>
          <div className="amount">
            <span aria-hidden="true">฿</span>
            <input
              id="new-amount"
              className="input"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>

        <div className="two">
          <div className="field">
            <label htmlFor="new-date">Date</label>
            <input id="new-date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="new-note">Note</label>
            <input id="new-note" className="input" placeholder="Optional" maxLength={255} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>

        <button className="btn" type="submit" disabled={createTxn.isPending}>
          {createTxn.isPending ? 'Saving…' : 'Save transaction'}
        </button>
      </form>
    </section>
  )
}

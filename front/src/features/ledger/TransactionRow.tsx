import { useState, type FormEvent } from 'react'

import { ApiError } from '../../lib/api'
import { useDeleteTransaction, useUpdateTransaction, type Item, type Transaction } from './api'
import { cleanAmount, formatSatang, isValidAmount, toSatang } from './money'

interface Props {
  txn: Transaction
  items: Item[]
  editing: boolean
  onEdit: () => void
  onClose: () => void
  onMessage: (message: string) => void
}

// One transaction: a plain row, an inline edit form, or an inline "delete?" question.
export function TransactionRow({ txn, items, editing, onEdit, onClose, onMessage }: Props) {
  const [confirming, setConfirming] = useState(false)
  const del = useDeleteTransaction()
  const income = txn.type === 'income'

  if (editing) {
    return <EditForm txn={txn} items={items} onClose={onClose} onMessage={onMessage} />
  }

  if (confirming) {
    return (
      <li className="txn txn-confirm">
        <span className="txn-confirm-text">
          Delete <b>{txn.item_name}</b> · {income ? '+' : '−'}{formatSatang(toSatang(txn.amount))}?
        </span>
        <span className="txn-actions">
          <button
            type="button"
            className="btn btn-sm btn-danger"
            disabled={del.isPending}
            onClick={() =>
              del.mutate(txn.id, {
                onSuccess: () => onMessage(`Deleted ${txn.item_name}`),
                onError: (err) => {
                  setConfirming(false)
                  onMessage(err instanceof ApiError ? err.message : "Couldn't delete. Try again.")
                },
              })
            }
          >
            {del.isPending ? 'Deleting…' : 'Delete'}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>
            Keep
          </button>
        </span>
      </li>
    )
  }

  return (
    <li className="txn">
      <span className={`txn-tag${income ? ' in' : ''}`} aria-hidden="true">
        {txn.category_name.slice(0, 2)}
      </span>
      <div className="txn-main">
        <b>{txn.item_name}</b>
        <small>
          {txn.category_name}
          {txn.note && ` · ${txn.note}`}
        </small>
      </div>
      <span className={`txn-amt ${income ? 'up' : 'down'}`}>
        {income ? '+' : '−'}
        {formatSatang(toSatang(txn.amount))}
      </span>
      <span className="txn-actions">
        <button type="button" className="icon-btn txn-btn" aria-label={`Edit ${txn.item_name}`} title="Edit" onClick={onEdit}>
          <PencilIcon />
        </button>
        <button
          type="button"
          className="icon-btn txn-btn"
          aria-label={`Delete ${txn.item_name}`}
          title="Delete"
          onClick={() => setConfirming(true)}
        >
          <TrashIcon />
        </button>
      </span>
    </li>
  )
}

function EditForm({ txn, items, onClose, onMessage }: Omit<Props, 'editing' | 'onEdit'>) {
  const update = useUpdateTransaction()
  const [itemId, setItemId] = useState(String(txn.item_id))
  const [amount, setAmount] = useState(txn.amount)
  const [date, setDate] = useState(txn.txn_date)
  const [note, setNote] = useState(txn.note)
  const [error, setError] = useState<string | null>(null)

  // Active items, plus the current one even if it was hidden later.
  const choices = items.filter((i) => i.is_active || i.id === txn.item_id)
  const groups = new Map<string, Item[]>()
  for (const i of choices) {
    const label = `${i.category_name} (${i.type})`
    groups.set(label, [...(groups.get(label) ?? []), i])
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const value = cleanAmount(amount)
    if (!isValidAmount(value)) return setError('Enter an amount greater than 0, like 85 or 85.50')
    if (!date) return setError('Pick a date')
    setError(null)
    update.mutate(
      { id: txn.id, item_id: Number(itemId), amount: value, txn_date: date, note: note.trim() },
      {
        onSuccess: (t) => {
          onMessage(`Updated ${t.item_name}`)
          onClose()
        },
        onError: (err) => setError(err instanceof ApiError ? err.message : "Couldn't save. Try again."),
      },
    )
  }

  const id = (name: string) => `edit-${txn.id}-${name}`

  return (
    <li className="txn-edit">
      <form onSubmit={onSubmit} noValidate>
        {error && (
          <div className="alert" role="alert">
            <span aria-hidden="true">●</span>
            <span>{error}</span>
          </div>
        )}
        <div className="field">
          <label htmlFor={id('item')}>Item</label>
          <select id={id('item')} className="input" value={itemId} onChange={(e) => setItemId(e.target.value)}>
            {[...groups].map(([label, list]) => (
              <optgroup key={label} label={label}>
                {list.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                    {!i.is_active ? ' (hidden)' : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="two">
          <div className="field">
            <label htmlFor={id('amount')}>Amount</label>
            <div className="amount">
              <span aria-hidden="true">฿</span>
              <input id={id('amount')} className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label htmlFor={id('date')}>Date</label>
            <input id={id('date')} className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor={id('note')}>Note</label>
          <input id={id('note')} className="input" placeholder="Optional" maxLength={255} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="txn-edit-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-sm" disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </li>
  )
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </svg>
  )
}

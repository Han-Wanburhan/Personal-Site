import { useState } from 'react'

import { ApiError } from '../../lib/api'
import { useCreateTransactions, useTransactions, type Transaction } from './api'
import { monthLabel, monthRange, shiftDate, shiftMonth } from './dates'
import { cleanAmount, formatSatang, isValidAmount, toSatang } from './money'
import { amountText, TYPE_CLASS } from './types'

interface Props {
  month: string // the month to copy into, "2026-11"
  current: Transaction[] // what is already in that month
  onDone: (message: string) => void
  onCancel: () => void
}

// typed text → satang for the running total; 0 while the text isn't a valid amount yet
const amountSatang = (text: string) => {
  const v = cleanAmount(text)
  return isValidAmount(v) ? toSatang(v) : 0
}

interface Choice {
  picked: boolean
  amount: string // positive text; a withdrawal keeps its minus sign separately
}

// Copies chosen entries of the previous month into `month`: same day of the month
// (or the last day if shorter), same item, amount and note, and not paid yet.
export function CopyMonth({ month, current, onDone, onCancel }: Props) {
  const source = shiftMonth(month, -1)
  const { from, to } = monthRange(source)
  const sourceQ = useTransactions(from, to)
  const createMany = useCreateTransactions()
  const [choices, setChoices] = useState<Record<number, Choice>>({})
  const [error, setError] = useState<string | null>(null)

  // Oldest first, like a bill list. Items already recorded this month start unticked.
  const rows = [...(sourceQ.data ?? [])].sort((a, b) => a.txn_date.localeCompare(b.txn_date) || a.id - b.id)
  const alreadyThere = new Set(current.map((t) => t.item_id))
  const choiceOf = (t: Transaction): Choice =>
    choices[t.id] ?? { picked: !alreadyThere.has(t.item_id), amount: t.amount.replace(/^-/, '') }
  const setChoice = (t: Transaction, change: Partial<Choice>) =>
    setChoices((c) => ({ ...c, [t.id]: { ...choiceOf(t), ...change } }))

  const picked = rows.filter((t) => choiceOf(t).picked)
  const allPicked = rows.length > 0 && picked.length === rows.length

  const copy = () => {
    const bad = picked.find((t) => !isValidAmount(cleanAmount(choiceOf(t).amount)))
    if (bad) return setError(`Check the amount of ${bad.item_name}: a number greater than 0, like 85 or 85.50`)
    setError(null)
    createMany.mutate(
      picked.map((t) => {
        const value = cleanAmount(choiceOf(t).amount)
        return {
          item_id: t.item_id,
          amount: t.amount.startsWith('-') ? `-${value}` : value,
          txn_date: shiftDate(t.txn_date, 1),
          note: t.note,
          is_paid: false,
        }
      }),
      {
        onSuccess: (r) => onDone(`Copied ${r.created} ${r.created === 1 ? 'entry' : 'entries'} into ${monthLabel(month)}`),
        onError: (err) => setError(err instanceof ApiError ? err.message : "Couldn't copy. Check that the API is running."),
      },
    )
  }

  return (
    <div className="copy-month">
      <div className="copy-head">
        <p>
          Copy from <b>{monthLabel(source)}</b> into <b>{monthLabel(month)}</b>. Same day, not paid yet. Change any amount
          before copying.
        </p>
        {rows.length > 0 && (
          <button
            type="button"
            className="link-btn"
            onClick={() => setChoices(Object.fromEntries(rows.map((t) => [t.id, { ...choiceOf(t), picked: !allPicked }])))}
          >
            {allPicked ? 'Untick all' : 'Tick all'}
          </button>
        )}
      </div>

      {error && (
        <div className="alert" role="alert">
          <span aria-hidden="true">●</span>
          <span>{error}</span>
        </div>
      )}

      {sourceQ.isPending ? (
        <div className="empty-state">Loading {monthLabel(source)}…</div>
      ) : rows.length === 0 ? (
        <div className="empty-state">Nothing recorded in {monthLabel(source)}, so there is nothing to copy.</div>
      ) : (
        <ul className="copy-list">
          {rows.map((t) => {
            const c = choiceOf(t)
            const id = `copy-${t.id}`
            return (
              <li key={t.id} className={c.picked ? undefined : 'off'}>
                <input id={id} type="checkbox" checked={c.picked} onChange={(e) => setChoice(t, { picked: e.target.checked })} />
                <label htmlFor={id} className="copy-main">
                  <b>{t.item_name}</b>
                  <small>
                    {shiftDate(t.txn_date, 1).slice(8)} · {t.category_name}
                    {alreadyThere.has(t.item_id) && <span className="unpaid-note"> · already in {monthLabel(month)}</span>}
                  </small>
                </label>
                <div className={`amount copy-amount ${TYPE_CLASS[t.type]}`}>
                  <span aria-hidden="true">{amountText(t.type, t.amount).charAt(0)}</span>
                  <input
                    className="input"
                    inputMode="decimal"
                    aria-label={`Amount for ${t.item_name}`}
                    value={c.amount}
                    disabled={!c.picked}
                    onChange={(e) => setChoice(t, { amount: e.target.value })}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="copy-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn btn-sm" onClick={copy} disabled={picked.length === 0 || createMany.isPending}>
          {createMany.isPending
            ? 'Copying…'
            : `Copy ${picked.length} ${picked.length === 1 ? 'entry' : 'entries'}${
                picked.length ? ` · ฿${formatSatang(picked.reduce((s, t) => s + amountSatang(choiceOf(t).amount), 0))}` : ''
              }`}
        </button>
      </div>
    </div>
  )
}

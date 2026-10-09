import { useEffect, useState } from 'react'

import { AddFab } from '../components/AddFab'
import { AppHeader } from '../components/AppHeader'
import { useItems, useTransactions, type Transaction } from '../features/ledger/api'
import { formatSatang, toSatang } from '../features/ledger/money'
import { NewTransactionForm } from '../features/ledger/NewTransactionForm'
import { TransactionRow } from '../features/ledger/TransactionRow'
import { MONTHS, todayISO } from '../lib/format'

// "2026-09" → { from: "2026-09-01", to: "2026-09-30" }
function monthRange(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return { from: `${ym}-01`, to: `${ym}-${String(lastDay).padStart(2, '0')}` }
}

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return `${MONTHS[m - 1]} ${y}`
}

const dayLabel = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

// Group the (newest first) list by day, keeping the order.
function byDay(list: Transaction[]) {
  const groups: { date: string; txns: Transaction[] }[] = []
  for (const t of list) {
    const last = groups[groups.length - 1]
    if (last && last.date === t.txn_date) last.txns.push(t)
    else groups.push({ date: t.txn_date, txns: [t] })
  }
  return groups
}

export function TransactionsPage() {
  const thisMonth = todayISO().slice(0, 7)
  const [month, setMonth] = useState(thisMonth)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const { from, to } = monthRange(month)
  const txnsQ = useTransactions(from, to)
  const itemsQ = useItems()

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(id)
  }, [toast])

  const list = txnsQ.data ?? []
  let income = 0
  let expense = 0
  for (const t of list) {
    if (t.type === 'income') income += toSatang(t.amount)
    else expense += toSatang(t.amount)
  }
  const net = income - expense

  const goTo = (ym: string) => {
    setEditingId(null)
    setMonth(ym)
  }

  return (
    <div className="home">
      <AppHeader />

      <div className="hello">
        <div>
          <div className="eyebrow">Transactions</div>
          <h1>{monthLabel(month)}</h1>
        </div>
        <div className="month-nav" role="group" aria-label="Month">
          <button type="button" className="icon-btn" aria-label="Previous month" onClick={() => goTo(shiftMonth(month, -1))}>
            ‹
          </button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={month === thisMonth} onClick={() => goTo(thisMonth)}>
            This month
          </button>
          <button type="button" className="icon-btn" aria-label="Next month" onClick={() => goTo(shiftMonth(month, 1))}>
            ›
          </button>
        </div>
      </div>

      <div className="figures figures-3">
        <div className="fig">
          <div className="eyebrow">Income</div>
          <div className="fig-value up"><small>฿</small>{formatSatang(income)}</div>
        </div>
        <div className="fig">
          <div className="eyebrow">Expenses</div>
          <div className="fig-value down"><small>฿</small>{formatSatang(expense)}</div>
        </div>
        <div className="fig">
          <div className="eyebrow">Net</div>
          <div className={`fig-value ${net >= 0 ? 'up' : 'down'}`}>
            <small>฿</small>
            {net < 0 ? '−' : ''}
            {formatSatang(Math.abs(net))}
          </div>
        </div>
      </div>

      <div className="grid">
        <section className="panel" aria-busy={txnsQ.isFetching}>
          <div className="panel-head">
            <h2>{list.length} {list.length === 1 ? 'transaction' : 'transactions'}</h2>
            {txnsQ.isFetching && <span className="field-hint">Loading…</span>}
          </div>

          {txnsQ.isError ? (
            <div className="empty-state">
              <p>Couldn't load transactions. Check that the API is running.</p>
              <button type="button" className="btn btn-sm" onClick={() => txnsQ.refetch()}>
                Try again
              </button>
            </div>
          ) : txnsQ.isPending ? (
            <div className="empty-state">Loading…</div>
          ) : list.length === 0 ? (
            <div className="empty-state">No transactions in {monthLabel(month)} yet. Add one with the form.</div>
          ) : (
            byDay(list).map((g) => (
              <div key={g.date} className="day">
                <div className="day-head">
                  <span>{dayLabel.format(new Date(`${g.date}T00:00:00`))}</span>
                </div>
                <ul className="txns">
                  {g.txns.map((t) => (
                    <TransactionRow
                      key={t.id}
                      txn={t}
                      items={itemsQ.data ?? []}
                      editing={editingId === t.id}
                      onEdit={() => setEditingId(t.id)}
                      onClose={() => setEditingId(null)}
                      onMessage={setToast}
                    />
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>

        <div className="side tx-side">
          <NewTransactionForm
            onSaved={(message, txnDate) => {
              setToast(message)
              goTo(txnDate.slice(0, 7)) // jump to the month it was saved in
            }}
          />
        </div>
      </div>

      <AddFab />

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}

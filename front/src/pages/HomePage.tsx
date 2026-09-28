import { useEffect, useState } from 'react'

import { Brand } from '../components/Brand'
import { useLogout, useMe } from '../features/auth/hooks'
import { AddTransactionForm } from '../features/ledger/AddTransactionForm'
import { RecentTransactions } from '../features/ledger/RecentTransactions'
import {
  SAMPLE_CURRENT_MONTH,
  SAMPLE_YEAR,
  sampleCategories,
  sampleSummary,
  sampleTxns,
  type Txn,
} from '../features/ledger/sample'
import { SummaryFigures } from '../features/ledger/SummaryFigures'
import { YearTable } from '../features/ledger/YearTable'
import { ThemeControls } from '../theme/ThemeControls'

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

const longDate = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export function HomePage() {
  // ProtectedRoute only renders this page once /me has loaded.
  const { data: user } = useMe()
  const logout = useLogout()

  const [txns, setTxns] = useState<Txn[]>(sampleTxns)
  const [lastAddedId, setLastAddedId] = useState<number>()
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(id)
  }, [toast])

  if (!user) return null

  const now = new Date()
  const current = sampleSummary.find((m) => m.month === SAMPLE_CURRENT_MONTH)!
  const previous = sampleSummary.find((m) => m.month === SAMPLE_CURRENT_MONTH - 1)

  const addTxn = (t: Omit<Txn, 'id'>) => {
    const id = Math.max(0, ...txns.map((x) => x.id)) + 1
    setTxns([{ ...t, id }, ...txns].slice(0, 5))
    setLastAddedId(id)
    setToast('Added to this list only. Saving comes with the transactions API.')
  }

  return (
    <div className="home">
      <header className="topbar">
        <Brand />
        <div className="user">
          <ThemeControls />
          <div className="avatar" aria-hidden="true">{user.username.slice(0, 2)}</div>
          <div className="user-meta">
            <b>{user.username}</b>
            <small>{user.email}</small>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <div className="hello">
        <div>
          <div className="eyebrow">{longDate.format(now)}</div>
          <h1>{greeting(now.getHours())}, {user.username}</h1>
        </div>
        <span className="badge">Example figures</span>
      </div>

      <SummaryFigures current={current} previous={previous} />

      <div className="grid">
        <YearTable year={SAMPLE_YEAR} months={sampleSummary} currentMonth={SAMPLE_CURRENT_MONTH} />
        <div className="side">
          <AddTransactionForm categories={sampleCategories} onAdd={addTxn} onInvalid={setToast} />
          <RecentTransactions txns={txns} highlightId={lastAddedId} />
        </div>
      </div>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}

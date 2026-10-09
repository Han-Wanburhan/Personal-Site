import { useEffect, useState } from 'react'

import { AddFab } from '../components/AddFab'
import { AppHeader } from '../components/AppHeader'
import { useMe } from '../features/auth/hooks'
import { useTransactions } from '../features/ledger/api'
import { NewTransactionForm } from '../features/ledger/NewTransactionForm'
import { RecentList } from '../features/ledger/RecentList'
import { toFigures, useSummary } from '../features/ledger/summary'
import { SummaryFigures } from '../features/ledger/SummaryFigures'
import { YearTable } from '../features/ledger/YearTable'
import { todayISO } from '../lib/format'

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

const longDate = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

// First day of the previous month, as YYYY-MM-DD ("recent" = this month and last).
function startOfPreviousMonth(today: string): string {
  const [y, m] = today.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export function HomePage() {
  // ProtectedRoute only renders this page once /me has loaded.
  const { data: user } = useMe()

  const today = todayISO()
  const thisYear = Number(today.slice(0, 4))
  const thisMonth = Number(today.slice(5, 7))

  const [year, setYear] = useState(thisYear)
  const [toast, setToast] = useState<string | null>(null)

  const currentQ = useSummary(thisYear) // figures for this month
  const lastYearQ = useSummary(thisYear - 1, thisMonth === 1) // only needed in January (to compare with December)
  const tableQ = useSummary(year) // the yearly table (same request as currentQ when year = thisYear)
  const recentQ = useTransactions(startOfPreviousMonth(today), today)

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(id)
  }, [toast])

  if (!user) return null
  const now = new Date()

  // ----- figures for this month -----
  const months = currentQ.data?.months.map(toFigures)
  const current = months?.[thisMonth - 1]
  const previous = thisMonth === 1 ? (lastYearQ.data ? toFigures(lastYearQ.data.months[11]) : undefined) : months?.[thisMonth - 2]

  // ----- yearly table: past months show figures, future months show "—" -----
  const table = tableQ.data
  const tableMonths = (table?.months ?? [])
    .map(toFigures)
    .filter((m) => m.count > 0 || year < thisYear || (year === thisYear && m.month <= thisMonth))

  return (
    <div className="home">
      <AppHeader />

      <div className="hello">
        <div>
          <div className="eyebrow">{longDate.format(now)}</div>
          <h1>{greeting(now.getHours())}, {user.username}</h1>
        </div>
      </div>

      {currentQ.isError ? (
        <div className="panel empty-state load-error">
          <p>Couldn't load your figures. Check that the API is running.</p>
          <button type="button" className="btn btn-sm" onClick={() => currentQ.refetch()}>
            Try again
          </button>
        </div>
      ) : current ? (
        <SummaryFigures current={current} previous={previous} />
      ) : (
        <div className="panel empty-state load-error">Loading your figures…</div>
      )}

      <div className="grid home-grid">
        {table ? (
          <YearTable
            year={year}
            months={tableMonths}
            total={toFigures(table.total)}
            currentMonth={year === thisYear ? thisMonth : 0}
            totalLabel={year === thisYear ? 'Year to date' : `Total ${year}`}
            onPrev={() => setYear((y) => y - 1)}
            onNext={() => setYear((y) => y + 1)}
            nextDisabled={year >= thisYear}
            loading={tableQ.isFetching}
          />
        ) : (
          <section className="panel">
            <div className="panel-head"><h2>{year} by month</h2></div>
            <div className="empty-state">{tableQ.isError ? "Couldn't load this year." : 'Loading…'}</div>
          </section>
        )}

        <div className="side">
          <NewTransactionForm onSaved={(message) => setToast(message)} />
          <RecentList txns={(recentQ.data ?? []).slice(0, 5)} loading={recentQ.isPending} />
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

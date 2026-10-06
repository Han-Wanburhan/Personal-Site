import { formatPercent, formatWhole, MONTHS } from '../../lib/format'
import type { MonthFigures } from './summary'

interface Props {
  year: number
  months: MonthFigures[] // the months to show figures for; the rest show "—"
  total: MonthFigures
  currentMonth: number // highlighted row, 0 for none
  totalLabel: string
  onPrev: () => void
  onNext: () => void
  nextDisabled: boolean
  loading: boolean
}

export function YearTable({ year, months, total, currentMonth, totalLabel, onPrev, onNext, nextDisabled, loading }: Props) {
  const byMonth = new Map(months.map((m) => [m.month, m]))

  return (
    <section className="panel" aria-busy={loading}>
      <div className="panel-head">
        <h2>{year} by month</h2>
        <div className="month-nav" role="group" aria-label="Year">
          <button type="button" className="icon-btn" aria-label="Previous year" onClick={onPrev}>
            ‹
          </button>
          <button type="button" className="icon-btn" aria-label="Next year" onClick={onNext} disabled={nextDisabled}>
            ›
          </button>
        </div>
      </div>
      <div className="table-wrap">
        <table className="year-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Income</th>
              <th>Expenses</th>
              <th>Saved</th>
              <th>Savings rate</th>
            </tr>
          </thead>
          <tbody>
            {MONTHS.map((name, i) => {
              const m = byMonth.get(i + 1)
              if (!m) {
                return (
                  <tr key={name} className="future">
                    <td>{name}</td><td>—</td><td>—</td><td>—</td><td>—</td>
                  </tr>
                )
              }
              return (
                <tr key={name} className={m.month === currentMonth ? 'current' : undefined}>
                  <td>{name}</td>
                  <td>{formatWhole(m.income)}</td>
                  <td>{formatWhole(m.expense)}</td>
                  <td className={m.saved >= 0 ? 'up' : 'down'}>{formatWhole(m.saved)}</td>
                  <td><Rate rate={m.rate} /></td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>{totalLabel}</td>
              <td>{formatWhole(total.income)}</td>
              <td>{formatWhole(total.expense)}</td>
              <td className={total.saved >= 0 ? 'up' : 'down'}>{formatWhole(total.saved)}</td>
              <td>{total.rate === null ? '—' : formatPercent(total.rate)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}

function Rate({ rate }: { rate: number | null }) {
  if (rate === null) return <>—</>
  return (
    <span className="rate">
      {formatPercent(rate)}
      <span className="rate-bar"><i style={{ width: `${Math.max(0, Math.min(rate, 100))}%` }} /></span>
    </span>
  )
}

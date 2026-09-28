import { formatPercent, formatWhole, MONTHS } from '../../lib/format'
import type { MonthSummary } from './sample'

interface Props {
  year: number
  months: MonthSummary[]
  currentMonth: number
}

export function YearTable({ year, months, currentMonth }: Props) {
  const byMonth = new Map(months.map((m) => [m.month, m]))
  const totalIncome = months.reduce((s, m) => s + m.income, 0)
  const totalExpense = months.reduce((s, m) => s + m.expense, 0)
  const totalSaved = totalIncome - totalExpense

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{year} by month</h2>
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
              const saved = m.income - m.expense
              const rate = m.income > 0 ? (saved / m.income) * 100 : 0
              return (
                <tr key={name} className={m.month === currentMonth ? 'current' : undefined}>
                  <td>{name}</td>
                  <td>{formatWhole(m.income)}</td>
                  <td>{formatWhole(m.expense)}</td>
                  <td className={saved >= 0 ? 'up' : 'down'}>{formatWhole(saved)}</td>
                  <td>
                    <span className="rate">
                      {formatPercent(rate)}
                      <span className="rate-bar"><i style={{ width: `${Math.max(0, Math.min(rate, 100))}%` }} /></span>
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>Year to date</td>
              <td>{formatWhole(totalIncome)}</td>
              <td>{formatWhole(totalExpense)}</td>
              <td className={totalSaved >= 0 ? 'up' : 'down'}>{formatWhole(totalSaved)}</td>
              <td>{formatPercent(totalIncome > 0 ? (totalSaved / totalIncome) * 100 : 0)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}

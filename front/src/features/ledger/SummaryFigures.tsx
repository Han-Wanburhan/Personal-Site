import { formatMoney, formatPercent, MONTHS } from '../../lib/format'
import type { MonthFigures } from './summary'

interface Props {
  current: MonthFigures
  previous?: MonthFigures
}

// Percentage change, or null when there is nothing to compare with.
const change = (now: number, before: number) => (before > 0 ? ((now - before) / before) * 100 : null)

export function SummaryFigures({ current, previous }: Props) {
  const short = MONTHS[current.month - 1].slice(0, 3)
  const prevName = previous ? MONTHS[previous.month - 1] : ''
  const incomeChange = previous ? change(current.income, previous.income) : null
  const expenseChange = previous ? change(current.expense, previous.expense) : null
  const rate = current.rate

  return (
    <div className="figures">
      <div className="fig">
        <div className="eyebrow">Income · {short}</div>
        <div className="fig-value"><small>฿</small>{formatMoney(current.income)}</div>
        {incomeChange !== null && <Delta value={incomeChange} goodWhenUp label={prevName} />}
      </div>
      <div className="fig">
        <div className="eyebrow">Expenses · {short}</div>
        <div className="fig-value"><small>฿</small>{formatMoney(current.expense)}</div>
        {expenseChange !== null && <Delta value={expenseChange} goodWhenUp={false} label={prevName} />}
      </div>
      <div className="fig">
        <div className="eyebrow">Saved · {short}</div>
        <div className={`fig-value ${current.saved >= 0 ? 'up' : 'down'}`}>
          <small>฿</small>
          {current.saved < 0 ? '−' : ''}
          {formatMoney(Math.abs(current.saved))}
        </div>
        <div className="delta">Income minus expenses</div>
      </div>
      <div className="fig">
        <div className="eyebrow">Savings rate</div>
        <div className="fig-value">{rate === null ? '—' : formatPercent(rate)}</div>
        <div className="meter"><i style={{ width: `${Math.max(0, Math.min(rate ?? 0, 100))}%` }} /></div>
        {rate === null ? (
          <div className="delta">No income this month yet</div>
        ) : (
          previous && previous.rate !== null && <div className="delta">{prevName}: {formatPercent(previous.rate)}</div>
        )}
      </div>
    </div>
  )
}

function Delta({ value, goodWhenUp, label }: { value: number; goodWhenUp: boolean; label: string }) {
  const good = goodWhenUp ? value >= 0 : value <= 0
  return (
    <div className="delta">
      <b className={good ? 'up' : 'down'}>
        {value >= 0 ? '▲' : '▼'} {Math.abs(value).toFixed(1)}%
      </b>{' '}
      vs {label}
    </div>
  )
}

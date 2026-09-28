import { formatMoney, formatPercent, MONTHS } from '../../lib/format'
import type { MonthSummary } from './sample'

interface Props {
  current: MonthSummary
  previous?: MonthSummary
}

const rateOf = (m: MonthSummary) => (m.income > 0 ? ((m.income - m.expense) / m.income) * 100 : 0)
const change = (now: number, before: number) => ((now - before) / before) * 100

export function SummaryFigures({ current, previous }: Props) {
  const short = MONTHS[current.month - 1].slice(0, 3)
  const prevName = previous ? MONTHS[previous.month - 1] : null
  const saved = current.income - current.expense
  const rate = rateOf(current)

  return (
    <div className="figures">
      <div className="fig">
        <div className="eyebrow">Income · {short}</div>
        <div className="fig-value"><small>฿</small>{formatMoney(current.income)}</div>
        {previous && <Delta value={change(current.income, previous.income)} goodWhenUp label={prevName!} />}
      </div>
      <div className="fig">
        <div className="eyebrow">Expenses · {short}</div>
        <div className="fig-value"><small>฿</small>{formatMoney(current.expense)}</div>
        {previous && <Delta value={change(current.expense, previous.expense)} goodWhenUp={false} label={prevName!} />}
      </div>
      <div className="fig">
        <div className="eyebrow">Saved · {short}</div>
        <div className={`fig-value ${saved >= 0 ? 'up' : 'down'}`}><small>฿</small>{formatMoney(saved)}</div>
        <div className="delta">Income minus expenses</div>
      </div>
      <div className="fig">
        <div className="eyebrow">Savings rate</div>
        <div className="fig-value">{formatPercent(rate)}</div>
        <div className="meter"><i style={{ width: `${Math.max(0, Math.min(rate, 100))}%` }} /></div>
        {previous && <div className="delta">{prevName}: {formatPercent(rateOf(previous))}</div>}
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

import { formatMoney, formatPercent, MONTHS } from '../../lib/format'
import type { MonthFigures } from './summary'

interface Props {
  current: MonthFigures
  previous?: MonthFigures
}

// Percentage change, or null when there is nothing to compare with.
const change = (now: number, before: number) => (before > 0 ? ((now - before) / before) * 100 : null)

// "−1,234.00" for negatives, so a withdrawal-heavy month reads correctly
const signed = (n: number) => (n < 0 ? '−' : '') + formatMoney(Math.abs(n))

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
        <div className="eyebrow">Saved &amp; invested · {short}</div>
        <div className={`fig-value ${current.put >= 0 ? 'sv' : 'down'}`}>
          <small>฿</small>
          {signed(current.put)}
        </div>
        <div className="delta">
          Saving <span className="sv">{signed(current.saving)}</span> · Invest <span className="iv">{signed(current.investment)}</span>
        </div>
      </div>
      <div className="fig">
        <div className="eyebrow">Savings rate</div>
        <div className="fig-value">{rate === null ? '—' : formatPercent(rate)}</div>
        <div className="meter"><i style={{ width: `${Math.max(0, Math.min(rate ?? 0, 100))}%` }} /></div>
        <div className="delta">
          Left over <b className={current.leftOver >= 0 ? 'up' : 'down'}>฿{signed(current.leftOver)}</b>
        </div>
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

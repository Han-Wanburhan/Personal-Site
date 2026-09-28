import { formatMoney } from '../../lib/format'
import type { Txn } from './sample'

const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })

interface Props {
  txns: Txn[]
  highlightId?: number
}

export function RecentTransactions({ txns, highlightId }: Props) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Recent</h2>
      </div>
      <ul className="txns">
        {txns.map((t) => {
          const income = t.type === 'income'
          return (
            <li key={t.id} className={`txn${t.id === highlightId ? ' new' : ''}`}>
              <span className={`txn-tag${income ? ' in' : ''}`} aria-hidden="true">
                {t.category.slice(0, 2)}
              </span>
              <div>
                <b>{t.item}</b>
                <small>
                  {dayMonth.format(new Date(`${t.date}T00:00:00`))} · {t.category}
                  {t.note && ` · ${t.note}`}
                </small>
              </div>
              <span className={`txn-amt ${income ? 'up' : 'down'}`}>
                {income ? '+' : '−'}
                {formatMoney(t.amount)}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

import { Link } from 'react-router'

import type { Transaction } from './api'
import { amountText, TYPE_CLASS } from './types'

const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })

interface Props {
  txns: Transaction[]
  loading: boolean
}

export function RecentList({ txns, loading }: Props) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Recent</h2>
        <Link className="link" to="/transactions">
          View all
        </Link>
      </div>
      {loading ? (
        <div className="empty-state">Loading…</div>
      ) : txns.length === 0 ? (
        <div className="empty-state">Nothing recorded in the last two months.</div>
      ) : (
        <ul className="txns">
          {txns.map((t) => {
            return (
              <li key={t.id} className="txn">
                <span className={`txn-tag ${TYPE_CLASS[t.type]}`} aria-hidden="true">
                  {t.category_name.slice(0, 2)}
                </span>
                <div className="txn-main">
                  <b>{t.item_name}</b>
                  <small>
                    {dayMonth.format(new Date(`${t.txn_date}T00:00:00`))} · {t.category_name}
                    {t.note && ` · ${t.note}`}
                  </small>
                </div>
                <span className={`txn-amt ${TYPE_CLASS[t.type]}`}>{amountText(t.type, t.amount)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

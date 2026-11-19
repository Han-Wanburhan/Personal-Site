import { useState } from 'react'
import { Link } from 'react-router'

import { AppHeader } from '../components/AppHeader'
import type { TxnType } from '../features/ledger/api'
import { formatSatang, toSignedSatang } from '../features/ledger/money'
import { toFigures, useItemsSummary, useSummary, type ItemYear } from '../features/ledger/summary'
import { TYPE_CLASS } from '../features/ledger/types'
import { formatPercent, formatWhole, MONTHS, todayISO } from '../lib/format'

// Same order as the Excel sheet: money in, money out, then what was put aside.
const SECTIONS: { type: TxnType; label: string }[] = [
  { type: 'income', label: 'Income' },
  { type: 'expense', label: 'Expenses' },
  { type: 'saving', label: 'Savings' },
  { type: 'investment', label: 'Investments' },
]

const ZERO12 = () => Array<number>(12).fill(0)

// Row values in satang (exact integers), plus the year total.
function sumRows(rows: number[][]): number[] {
  const out = ZERO12()
  for (const r of rows) r.forEach((v, i) => (out[i] += v))
  return out
}

const total = (months: number[]) => months.reduce((a, b) => a + b, 0)

// whole baht in the grid, like the sheet; exact amount on hover
function Amount({ satang }: { satang: number }) {
  if (satang === 0) return <span className="grid-empty">·</span>
  return (
    <span title={`฿${satang < 0 ? '−' : ''}${formatSatang(Math.abs(satang))}`}>
      {satang < 0 ? '−' : ''}
      {formatWhole(Math.abs(satang) / 100)}
    </span>
  )
}

export function YearGridPage() {
  const today = todayISO()
  const thisYear = Number(today.slice(0, 4))
  const [year, setYear] = useState(thisYear)
  const itemsQ = useItemsSummary(year)
  const summaryQ = useSummary(year)
  const currentMonth = year === thisYear ? Number(today.slice(5, 7)) : 0

  const items = itemsQ.data?.items ?? []
  const values = (it: ItemYear) => it.months.map(toSignedSatang)

  // type -> category -> items, keeping the API's order (type, category, item)
  const sections = SECTIONS.map((s) => {
    const own = items.filter((i) => i.type === s.type)
    const categories: { id: number; name: string; items: ItemYear[] }[] = []
    for (const it of own) {
      const last = categories[categories.length - 1]
      if (last && last.id === it.category_id) last.items.push(it)
      else categories.push({ id: it.category_id, name: it.category_name, items: [it] })
    }
    return { ...s, categories, months: sumRows(own.map(values)) }
  }).filter((s) => s.categories.length > 0)

  const months = (summaryQ.data?.months ?? []).map(toFigures)

  const cellLink = (it: ItemYear, m: number) => `/transactions?month=${year}-${String(m + 1).padStart(2, '0')}&item=${it.item_id}`

  return (
    <div className="home">
      <AppHeader />

      <div className="hello">
        <div>
          <div className="eyebrow">Year</div>
          <h1>{year} by item</h1>
        </div>
        <div className="month-nav" role="group" aria-label="Year">
          <button type="button" className="icon-btn" aria-label="Previous year" onClick={() => setYear((y) => y - 1)}>
            ‹
          </button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={year === thisYear} onClick={() => setYear(thisYear)}>
            This year
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Next year"
            disabled={year >= thisYear + 5}
            onClick={() => setYear((y) => y + 1)}
          >
            ›
          </button>
        </div>
      </div>

      <section className="panel" aria-busy={itemsQ.isFetching}>
        {itemsQ.isError ? (
          <div className="empty-state load-error">
            <p>Couldn't load {year}. Check that the API is running.</p>
            <button type="button" className="btn btn-sm" onClick={() => itemsQ.refetch()}>
              Try again
            </button>
          </div>
        ) : itemsQ.isPending ? (
          <div className="empty-state load-error">Loading {year}…</div>
        ) : sections.length === 0 ? (
          <div className="empty-state load-error">Nothing recorded in {year} yet.</div>
        ) : (
          <div className="table-wrap year-grid-wrap">
            <table className="year-grid">
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  {MONTHS.map((name, i) => (
                    <th key={name} scope="col" className={i + 1 === currentMonth ? 'now' : undefined}>
                      {name.slice(0, 3)}
                    </th>
                  ))}
                  <th scope="col">Total</th>
                </tr>
              </thead>

              {sections.map((s) => (
                <tbody key={s.type}>
                  <tr className="grid-section">
                    <th scope="colgroup" colSpan={14} className={TYPE_CLASS[s.type]}>
                      {s.label}
                    </th>
                  </tr>
                  {s.categories.map((c) => (
                    <CategoryRows key={c.id} name={c.name} items={c.items} values={values} cellLink={cellLink} currentMonth={currentMonth} />
                  ))}
                  <tr className="grid-total">
                    <th scope="row">Total {s.label.toLowerCase()}</th>
                    {s.months.map((v, i) => (
                      <td key={i} className={i + 1 === currentMonth ? 'now' : undefined}>
                        <Amount satang={v} />
                      </td>
                    ))}
                    <td>
                      <Amount satang={total(s.months)} />
                    </td>
                  </tr>
                </tbody>
              ))}

              {months.length === 12 && summaryQ.data && (
                <tbody className="grid-result">
                  <tr>
                    <th scope="row">Left over</th>
                    {months.map((m, i) => (
                      <td key={i} className={`${m.leftOver < 0 ? 'down' : ''} ${i + 1 === currentMonth ? 'now' : ''}`}>
                        <Amount satang={Math.round(m.leftOver * 100)} />
                      </td>
                    ))}
                    <td className={toFigures(summaryQ.data.total).leftOver < 0 ? 'down' : undefined}>
                      <Amount satang={Math.round(toFigures(summaryQ.data.total).leftOver * 100)} />
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Savings rate</th>
                    {months.map((m, i) => (
                      <td key={i} className={i + 1 === currentMonth ? 'now' : undefined}>
                        {m.rate === null ? <span className="grid-empty">·</span> : formatPercent(m.rate)}
                      </td>
                    ))}
                    <td>{summaryQ.data.total.savings_rate === null ? '—' : formatPercent(Number(summaryQ.data.total.savings_rate))}</td>
                  </tr>
                </tbody>
              )}
            </table>
          </div>
        )}
      </section>
      <p className="grid-hint">Tap an amount to open those transactions. Amounts are rounded to whole baht; hover for the exact figure.</p>
    </div>
  )
}

interface CategoryProps {
  name: string
  items: ItemYear[]
  values: (it: ItemYear) => number[]
  cellLink: (it: ItemYear, month: number) => string
  currentMonth: number
}

// One category: a heading row, its items, and a subtotal when it has more than one item.
function CategoryRows({ name, items, values, cellLink, currentMonth }: CategoryProps) {
  const sub = sumRows(items.map(values))
  return (
    <>
      <tr className="grid-cat">
        <th scope="rowgroup" colSpan={14}>{name}</th>
      </tr>
      {items.map((it) => {
        const v = values(it)
        return (
          <tr key={it.item_id}>
            <th scope="row" className="grid-item">{it.item_name}</th>
            {v.map((x, i) => (
              <td key={i} className={i + 1 === currentMonth ? 'now' : undefined}>
                {x === 0 ? (
                  <Amount satang={0} />
                ) : (
                  <Link to={cellLink(it, i)} aria-label={`${it.item_name}, ${MONTHS[i]}`}>
                    <Amount satang={x} />
                  </Link>
                )}
              </td>
            ))}
            <td className="grid-rowtotal">
              <Amount satang={total(v)} />
            </td>
          </tr>
        )
      })}
      {items.length > 1 && (
        <tr className="grid-sub">
          <th scope="row">Total {name}</th>
          {sub.map((x, i) => (
            <td key={i} className={i + 1 === currentMonth ? 'now' : undefined}>
              <Amount satang={x} />
            </td>
          ))}
          <td>
            <Amount satang={total(sub)} />
          </td>
        </tr>
      )}
    </>
  )
}

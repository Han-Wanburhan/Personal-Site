import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import { AppHeader } from '../components/AppHeader'
import { LAST_DAY, useImportExcel, useImportSheets, type ImportResult, type ImportSheet } from '../features/import/api'
import { formatSatang, toSatang } from '../features/ledger/money'
import { ApiError } from '../lib/api'
import { MONTHS, todayISO } from '../lib/format'

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1)

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Could not reach the server. Check that the API is running.'
}

export function ImportPage() {
  const today = todayISO()
  const thisYear = Number(today.slice(0, 4))
  const [file, setFile] = useState<File | null>(null)
  const [sheets, setSheets] = useState<ImportSheet[]>([])
  const [sheet, setSheet] = useState('')
  const [year, setYear] = useState(thisYear)
  const [from, setFrom] = useState(1)
  const [to, setTo] = useState(Number(today.slice(5, 7)) - 1 || 1) // up to last month: budgets are not real money
  const [days, setDays] = useState<Record<string, number>>({})
  const [preview, setPreview] = useState<ImportResult | null>(null)
  const [done, setDone] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const importExcel = useImportExcel()
  const importSheets = useImportSheets()

  // Any change to the file, year or months makes the preview out of date.
  const reset = () => {
    setPreview(null)
    setDone(null)
    setError(null)
  }

  // A new file: read its sheets and pick a sensible one (this year's, else the first that fits).
  const onFile = async (picked: File | null) => {
    setFile(picked)
    setSheets([])
    setSheet('')
    setDays({})
    reset()
    if (!picked) return
    try {
      const list = await importSheets.mutateAsync(picked)
      setSheets(list)
      const usable = list.filter((s) => s.importable)
      if (usable.length === 0) return setError('No sheet in this file has the หมวด / รายการ / months layout.')
      chooseSheet(usable.find((s) => s.year === thisYear) ?? usable[0])
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const chooseSheet = (s: ImportSheet) => {
    setSheet(s.name)
    if (s.year) setYear(s.year) // "รายรับ-รายจ่าย 2027" → 2027
    setDays({})
    reset()
  }

  const onPreview = async (e: FormEvent) => {
    e.preventDefault()
    if (!file) return setError('Choose your .xlsx file first.')
    if (!sheet) return setError('Choose a sheet to import.')
    if (from > to) return setError('"From" must be on or before "To".')
    reset()
    try {
      setPreview(await importExcel.mutateAsync({ file, sheet, year, from, to, days, apply: false }))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const onImport = async () => {
    if (!file || !preview) return
    setError(null)
    try {
      const res = await importExcel.mutateAsync({ file, sheet, year, from, to, days, apply: true })
      setDone(res)
      setPreview(null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const setDay = (item: string, day: number) =>
    setDays((d) => {
      const next = { ...d }
      if (day === LAST_DAY) delete next[item]
      else next[item] = day
      return next
    })

  const range = `${MONTHS[from - 1]} – ${MONTHS[to - 1]} ${year}`

  return (
    <div className="home">
      <AppHeader />

      <div className="hello">
        <div>
          <div className="eyebrow">Import</div>
          <h1>Import from Excel</h1>
        </div>
      </div>

      <div className="grid">
        <section className="panel" aria-busy={importExcel.isPending}>
          {done ? (
            <>
              <div className="panel-head"><h2>Imported</h2></div>
              <div className="empty-state import-done">
                <p>
                  Saved <b>{done.transactions}</b> transactions from “{done.sheet}” for {MONTHS[done.from - 1]} – {MONTHS[done.to - 1]} {done.year}
                  {' '}({done.categories_created} new categories, {done.items_created} new items).
                </p>
                <p>Dates can be fixed one by one on the Transactions page. Imported rows have the note “Imported from Excel”.</p>
                <div className="import-links">
                  <Link className="btn btn-sm" to="/">See Overview</Link>
                  <Link className="btn btn-ghost btn-sm" to="/transactions">Open Transactions</Link>
                </div>
              </div>
            </>
          ) : !preview ? (
            <>
              <div className="panel-head"><h2>Preview</h2></div>
              <div className="empty-state">
                <p>Choose your workbook, the sheet and the months that are real spending, then press Preview. Nothing is saved until you confirm.</p>
                <p>A sheet can be imported when it has หมวด / รายการ in columns A–B and one column per month (Jan–Dec). Other sheets are listed but greyed out.</p>
              </div>
            </>
          ) : (
            <>
              <div className="panel-head">
                <h2>Preview · {range}</h2>
                <span className="field-hint">{preview.sheet}</span>
              </div>
              <div className="table-wrap">
                <table className="year-table">
                  <thead>
                    <tr><th>Month</th><th>Income</th><th>Expenses</th><th>Transactions</th></tr>
                  </thead>
                  <tbody>
                    {preview.months.map((m) => (
                      <tr key={m.month}>
                        <td>{MONTHS[m.month - 1]}</td>
                        <td>{formatSatang(toSatang(m.income))}</td>
                        <td>{formatSatang(toSatang(m.expense))}</td>
                        <td>{m.transaction_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="panel-head">
                <h2>Day of the month</h2>
                <span className="field-hint">Day 31 in a 30-day month = the last day</span>
              </div>
              <div className="table-wrap">
                <table className="year-table import-items">
                  <thead>
                    <tr><th>Item</th><th>Category</th><th>Total</th><th>Dated on</th></tr>
                  </thead>
                  <tbody>
                    {preview.items.map((it) => {
                      const empty = toSatang(it.total) === 0
                      return (
                        <tr key={`${it.category}|${it.item}`} className={empty ? 'future' : undefined}>
                          <td>{it.item}</td>
                          <td className={it.type === 'income' ? 'up' : undefined}>{it.category}</td>
                          <td>{formatSatang(toSatang(it.total))}</td>
                          <td>
                            {empty ? (
                              '—'
                            ) : (
                              <select
                                className="input day-select"
                                aria-label={`Day for ${it.item}`}
                                value={days[it.item] ?? LAST_DAY}
                                onChange={(e) => setDay(it.item, Number(e.target.value))}
                              >
                                <option value={LAST_DAY}>Last day</option>
                                {DAY_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                              </select>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="import-confirm">
                <p>
                  Creates {preview.categories_created} categories, {preview.items_created} items
                  and <b>{preview.transactions}</b> transactions.
                </p>
                <button type="button" className="btn" onClick={onImport} disabled={importExcel.isPending || preview.transactions === 0}>
                  {importExcel.isPending ? 'Importing…' : `Import ${preview.transactions} transactions`}
                </button>
              </div>
            </>
          )}
        </section>

        <div className="side">
          <section className="panel">
            <div className="panel-head"><h2>Workbook</h2></div>
            <form className="add" onSubmit={onPreview} noValidate>
              {error && (
                <div className="alert" role="alert">
                  <span aria-hidden="true">●</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="field">
                <label htmlFor="import-file">Excel file (.xlsx)</label>
                <input
                  id="import-file"
                  className="input file-input"
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <div className="field">
                <label htmlFor="import-sheet">Sheet</label>
                <select
                  id="import-sheet"
                  className="input"
                  value={sheet}
                  disabled={sheets.length === 0}
                  onChange={(e) => {
                    const picked = sheets.find((s) => s.name === e.target.value)
                    if (picked) chooseSheet(picked)
                  }}
                >
                  {sheets.length === 0 && <option value="">{importSheets.isPending ? 'Reading sheets…' : 'Choose a file first'}</option>}
                  {sheets.map((s) => (
                    <option key={s.name} value={s.name} disabled={!s.importable}>
                      {s.importable ? s.name : `${s.name} (not a monthly sheet)`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="import-year">Year of the months</label>
                <input
                  id="import-year"
                  className="input"
                  type="number"
                  min={2000}
                  max={2100}
                  value={year}
                  onChange={(e) => {
                    setYear(Number(e.target.value))
                    reset()
                  }}
                />
              </div>

              <div className="two">
                <div className="field">
                  <label htmlFor="import-from">From</label>
                  <select id="import-from" className="input" value={from} onChange={(e) => { setFrom(Number(e.target.value)); reset() }}>
                    {MONTHS.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="import-to">To</label>
                  <select id="import-to" className="input" value={to} onChange={(e) => { setTo(Number(e.target.value)); reset() }}>
                    {MONTHS.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
                  </select>
                </div>
              </div>
              <p className="field-hint">Only months you really spent. Budget months would show up as real money.</p>

              <button className="btn btn-ghost" type="submit" disabled={importExcel.isPending || !sheet}>
                {importExcel.isPending && !preview ? 'Reading…' : 'Preview'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  )
}

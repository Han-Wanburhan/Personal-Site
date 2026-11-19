import { useEffect, useState, type FormEvent } from 'react'

import { AppHeader } from '../components/AppHeader'
import {
  useCategories,
  useCreateCategory,
  useCreateItem,
  useItems,
  useUpdateCategory,
  useUpdateItem,
  type Category,
  type Item,
  type RenameOrToggle,
  type TxnType,
} from '../features/ledger/api'
import { TXN_TYPES, TYPE_CLASS, TYPE_EXAMPLE, TYPE_LABEL } from '../features/ledger/types'
import { ApiError } from '../lib/api'

const errorText = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback)

// ---------- one name with Rename and Hide / Show ----------

interface NameRowProps {
  kind: 'category' | 'item'
  name: string
  active: boolean
  onSave: (change: Omit<RenameOrToggle, 'id'>, done: () => void) => void
  busy: boolean
}

function NameRow({ kind, name, active, onSave, busy }: NameRowProps) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(name)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next = text.trim()
    if (!next || next === name) return setEditing(false)
    onSave({ name: next }, () => setEditing(false))
  }

  if (editing) {
    return (
      <form className={`manage-row manage-${kind} editing`} onSubmit={submit}>
        <input
          className="input"
          value={text}
          maxLength={100}
          autoFocus
          aria-label={`New name for ${name}`}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setText(name)
              setEditing(false)
            }
          }}
        />
        <div className="manage-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setText(name); setEditing(false) }}>
            Cancel
          </button>
          <button type="submit" className="btn btn-sm" disabled={busy}>
            Save
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className={`manage-row manage-${kind}${active ? '' : ' off'}`}>
      <span className="manage-name">
        {name}
        {!active && <span className="badge-hidden">hidden</span>}
      </span>
      <div className="manage-actions">
        <button type="button" className="link-btn" onClick={() => { setText(name); setEditing(true) }}>
          Rename
        </button>
        <button type="button" className="link-btn" disabled={busy} onClick={() => onSave({ is_active: !active }, () => {})}>
          {active ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  )
}

// ---------- a small "name + Add" form ----------

interface AddFormProps {
  placeholder: string
  label: string
  busy: boolean
  onAdd: (name: string, done: () => void) => void
}

function AddForm({ placeholder, label, busy, onAdd }: AddFormProps) {
  const [name, setName] = useState('')
  return (
    <form
      className="manage-add"
      onSubmit={(e) => {
        e.preventDefault()
        if (name.trim()) onAdd(name.trim(), () => setName(''))
      }}
    >
      <input
        className="input"
        value={name}
        maxLength={100}
        placeholder={placeholder}
        aria-label={label}
        onChange={(e) => setName(e.target.value)}
      />
      <button type="submit" className="btn btn-ghost btn-sm" disabled={busy || !name.trim()}>
        Add
      </button>
    </form>
  )
}

// ---------- the page ----------

export function CategoriesPage() {
  const categoriesQ = useCategories()
  const itemsQ = useItems()
  const createCategory = useCreateCategory()
  const createItem = useCreateItem()
  const updateCategory = useUpdateCategory()
  const updateItem = useUpdateItem()

  const [type, setType] = useState<TxnType>('expense')
  const [showHidden, setShowHidden] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(id)
  }, [toast])

  const all = categoriesQ.data ?? []
  const allItems = itemsQ.data ?? []
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)
  const ofType = all.filter((c) => c.type === type)
  const hiddenCount = ofType.filter((c) => !c.is_active).length
  const shown = ofType.filter((c) => showHidden || c.is_active).sort(byName)
  const itemsOf = (c: Category) =>
    allItems.filter((i) => i.category_id === c.id && (showHidden || i.is_active)).sort(byName)

  const ok = (message: string, done: () => void) => () => {
    setError(null)
    setToast(message)
    done()
  }
  const fail = (fallback: string) => (err: unknown) => setError(errorText(err, fallback))

  const saveCategory = (c: Category, change: Omit<RenameOrToggle, 'id'>, done: () => void) =>
    updateCategory.mutate(
      { id: c.id, ...change },
      {
        onSuccess: ok(
          change.name ? `Renamed to ${change.name}` : change.is_active ? `${c.name} is shown again` : `${c.name} is hidden`,
          done,
        ),
        onError: fail("Couldn't save the category"),
      },
    )

  const saveItem = (i: Item, change: Omit<RenameOrToggle, 'id'>, done: () => void) =>
    updateItem.mutate(
      { id: i.id, ...change },
      {
        onSuccess: ok(
          change.name ? `Renamed to ${change.name}` : change.is_active ? `${i.name} is shown again` : `${i.name} is hidden`,
          done,
        ),
        onError: fail("Couldn't save the item"),
      },
    )

  return (
    <div className="home">
      <AppHeader />

      <div className="hello">
        <div>
          <div className="eyebrow">Settings</div>
          <h1>Categories</h1>
        </div>
      </div>

      <div className="grid manage-grid">
        <section className="panel" aria-busy={categoriesQ.isFetching || itemsQ.isFetching}>
          <div className="panel-head manage-head">
            <div className="seg" role="group" aria-label="Type">
              {TXN_TYPES.map((t) => (
                <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)}>
                  {TYPE_LABEL[t]} <small>{all.filter((c) => c.type === t && c.is_active).length}</small>
                </button>
              ))}
            </div>
            <label className="manage-toggle">
              <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
              Show hidden{hiddenCount > 0 ? ` (${hiddenCount})` : ''}
            </label>
          </div>

          {error && (
            <div className="alert manage-alert" role="alert">
              <span aria-hidden="true">●</span>
              <span>{error}</span>
            </div>
          )}

          {categoriesQ.isError || itemsQ.isError ? (
            <div className="empty-state">
              <p>Couldn't load categories. Check that the API is running.</p>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => { categoriesQ.refetch(); itemsQ.refetch() }}
              >
                Try again
              </button>
            </div>
          ) : categoriesQ.isPending || itemsQ.isPending ? (
            <div className="empty-state">Loading…</div>
          ) : shown.length === 0 ? (
            <div className="empty-state">
              No {TYPE_LABEL[type].toLowerCase()} categories{hiddenCount > 0 && !showHidden ? ' shown' : ''} yet.
            </div>
          ) : (
            <div className="manage-list">
              {shown.map((c) => {
                const items = itemsOf(c)
                return (
                  <article key={c.id} className={`manage-card ${TYPE_CLASS[c.type]}`}>
                    <NameRow
                      key={`${c.id}-${c.name}`}
                      kind="category"
                      name={c.name}
                      active={c.is_active}
                      busy={updateCategory.isPending}
                      onSave={(change, done) => saveCategory(c, change, done)}
                    />
                    {items.length === 0 ? (
                      <p className="manage-none">No items{showHidden ? '' : ' shown'}.</p>
                    ) : (
                      items.map((i) => (
                        <NameRow
                          key={`${i.id}-${i.name}`}
                          kind="item"
                          name={i.name}
                          active={i.is_active}
                          busy={updateItem.isPending}
                          onSave={(change, done) => saveItem(i, change, done)}
                        />
                      ))
                    )}
                    <AddForm
                      placeholder={TYPE_EXAMPLE[c.type].item}
                      label={`New item in ${c.name}`}
                      busy={createItem.isPending}
                      onAdd={(name, done) =>
                        createItem.mutate(
                          { categoryId: c.id, name },
                          { onSuccess: ok(`Added ${name} to ${c.name}`, done), onError: fail("Couldn't add the item") },
                        )
                      }
                    />
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <div className="side">
          <section className="panel">
            <div className="panel-head">
              <h2>New {TYPE_LABEL[type].toLowerCase()} category</h2>
            </div>
            <div className="manage-new">
              <AddForm
                placeholder={TYPE_EXAMPLE[type].category}
                label="New category name"
                busy={createCategory.isPending}
                onAdd={(name, done) =>
                  createCategory.mutate(
                    { name, type },
                    { onSuccess: ok(`Added ${name}`, done), onError: fail("Couldn't add the category") },
                  )
                }
              />
              <p className="grid-hint">
                Hidden categories and items leave the pickers in the add form. Their past amounts stay in every total.
              </p>
            </div>
          </section>
        </div>
      </div>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}

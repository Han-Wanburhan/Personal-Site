import { useEffect, useState } from 'react'

// id of the "Add transaction" panel, so the floating button can find it.
export const ADD_FORM_ID = 'add-transaction'

// Round "+" button shown on phones only (see .fab in app.css): on a phone the
// add form sits below the list, so this scrolls straight to it.
// Hidden while the form is on screen, so it never covers the Save button.
export function AddFab() {
  const [formVisible, setFormVisible] = useState(false)

  useEffect(() => {
    const form = document.getElementById(ADD_FORM_ID)
    if (!form) return
    const observer = new IntersectionObserver(([entry]) => setFormVisible(entry.isIntersecting), { threshold: 0.15 })
    observer.observe(form)
    return () => observer.disconnect()
  }, [])

  const go = () => {
    document.getElementById(ADD_FORM_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (formVisible) return null
  return (
    <button type="button" className="fab" aria-label="Add transaction" onClick={go}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  )
}

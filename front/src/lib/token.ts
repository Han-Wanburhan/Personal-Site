// JWT storage. "Keep me signed in" puts it in localStorage (survives closing
// the browser); otherwise sessionStorage (cleared when the tab closes).
const KEY = 'passbook.token'

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn()
  } catch {
    return fallback
  }
}

export function getToken(): string | null {
  return safe(() => localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY), null)
}

export function setToken(token: string, remember: boolean): void {
  clearToken()
  safe(() => (remember ? localStorage : sessionStorage).setItem(KEY, token), undefined)
}

export function clearToken(): void {
  safe(() => {
    localStorage.removeItem(KEY)
    sessionStorage.removeItem(KEY)
  }, undefined)
}

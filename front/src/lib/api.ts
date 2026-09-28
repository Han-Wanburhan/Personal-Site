import { clearToken, getToken } from './token'

// Error body from the Go API: {"error": "...", "details"?: {"field": "rule"}}
export class ApiError extends Error {
  readonly status: number
  readonly details?: Record<string, string>

  constructor(status: number, message: string, details?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export function isUnauthorized(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401
}

// api calls /api<path> with JSON and the bearer token (if any).
// A 401 on an authenticated request clears the stored token.
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`/api${path}`, { ...init, headers })

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { error?: string; details?: Record<string, string> }
      | null
    if (res.status === 401 && token) clearToken()
    throw new ApiError(res.status, body?.error ?? res.statusText, body?.details)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router'

import { AuthLayout } from '../components/AuthLayout'
import { PasswordInput } from '../components/PasswordInput'
import { useLogin } from '../features/auth/hooks'
import { ApiError } from '../lib/api'
import { getToken } from '../lib/token'

function loginErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) {
      return "Those details don't match an account. Check your email, username or phone and password, then try again."
    }
    if (err.status === 400) return 'Enter your email, username or phone, and your password.'
    if (err.status >= 500) return 'The server had a problem logging you in. Try again in a moment.'
    return err.message
  }
  return "Can't reach the server. Check that the API is running, then try again."
}

interface LoginState {
  from?: string
  registered?: string // username of a just-created account
}

export function LoginPage() {
  const location = useLocation()
  const state = (location.state as LoginState | null) ?? {}
  const login = useLogin()
  const [identifier, setIdentifier] = useState(state.registered ?? '')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)

  const from = state.from ?? '/'

  if (getToken() !== null && !login.isPending) {
    return <Navigate to={from} replace />
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!identifier.trim() || !password) {
      setFormError('Enter your email, username or phone, and your password.')
      return
    }
    setFormError(null)
    // On success the token is stored and the redirect above takes over.
    login.mutate({ identifier: identifier.trim(), password, remember })
  }

  const error = formError ?? (login.isError ? loginErrorMessage(login.error) : null)

  return (
    <AuthLayout headline="Every baht, written down." lead="Your private ledger for income, spending and what you keep each month.">
      <div className="eyebrow">Sign in</div>
      <h2>Welcome back</h2>
      <p className="sub">Log in to open your ledger.</p>

      <form className="stack" onSubmit={onSubmit} noValidate>
        {error ? (
          <div className="alert" role="alert">
            <span aria-hidden="true">●</span>
            <span>{error}</span>
          </div>
        ) : (
          state.registered && (
            <div className="notice" role="status">
              Account created. Log in with your password to continue.
            </div>
          )
        )}

        <div className="field">
          <label htmlFor="identifier">Email, username or phone</label>
          <input
            id="identifier"
            className="input"
            autoComplete="username"
            autoFocus={!state.registered}
            placeholder="you@example.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            autoFocus={!!state.registered}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <label className="check">
          <input id="remember" type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Keep me signed in on this device
        </label>

        <button className="btn" type="submit" disabled={login.isPending}>
          {login.isPending ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p className="switch-auth">
        New here? <Link className="link" to="/register">Create an account</Link>
      </p>
    </AuthLayout>
  )
}

import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'

import { AuthLayout } from '../components/AuthLayout'
import { PasswordInput } from '../components/PasswordInput'
import { useLogin, useRegister } from '../features/auth/hooks'
import { ApiError } from '../lib/api'
import { getToken } from '../lib/token'

type Field = 'email' | 'username' | 'phone' | 'password' | 'confirm'
type Values = Record<Field, string>
type Errors = Partial<Record<Field, string>>

// Same rules as back/internal/dto/auth.go (RegisterRequest) and handler/validator.go.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_RE = /^[a-zA-Z][a-zA-Z0-9_]{2,29}$/
const PHONE_RE = /^0\d{9}$/

function validate(v: Values): Errors {
  const e: Errors = {}
  const email = v.email.trim()
  if (!email) e.email = 'Enter your email'
  else if (!EMAIL_RE.test(email)) e.email = 'Enter an email like name@example.com'
  else if (email.length > 100) e.email = 'Use 100 characters or fewer'

  if (!v.username.trim()) e.username = 'Choose a username'
  else if (!USERNAME_RE.test(v.username.trim())) e.username = 'Use 3–30 letters, numbers or _, starting with a letter'

  if (!PHONE_RE.test(v.phone)) e.phone = 'Enter a 10-digit phone number starting with 0'

  if (v.password.length < 8) e.password = 'Use at least 8 characters'
  else if (v.password.length > 72) e.password = 'Use 72 characters or fewer'

  if (!v.confirm) e.confirm = 'Type your password again'
  else if (v.confirm !== v.password) e.confirm = "Passwords don't match"
  return e
}

// Turns an API error into field errors and/or a message for the banner.
function fromApiError(err: unknown): { fields: Errors; banner: string | null } {
  if (!(err instanceof ApiError)) {
    return { fields: {}, banner: "Can't reach the server. Check that the API is running, then try again." }
  }
  switch (err.message) {
    case 'email already taken':
      return { fields: { email: 'This email already has an account' }, banner: null }
    case 'username already taken':
      return { fields: { username: 'This username is taken. Try another one' }, banner: null }
    case 'phone already taken':
      return { fields: { phone: 'This phone number already has an account' }, banner: null }
  }
  if (err.status === 403) {
    return {
      fields: {},
      banner: 'New accounts are turned off on this server. Set ALLOW_REGISTER=true in the backend .env to allow sign-ups.',
    }
  }
  if (err.status === 400 && err.details) {
    const fields: Errors = {}
    for (const key of Object.keys(err.details)) {
      if (key === 'email' || key === 'username' || key === 'phone' || key === 'password') {
        fields[key] = 'Check this field'
      }
    }
    return { fields, banner: null }
  }
  if (err.status === 409) return { fields: {}, banner: 'An account with these details already exists. Try logging in.' }
  return { fields: {}, banner: 'The server had a problem creating your account. Try again in a moment.' }
}

export function RegisterPage() {
  const navigate = useNavigate()
  const register = useRegister()
  const login = useLogin()

  const [values, setValues] = useState<Values>({ email: '', username: '', phone: '', password: '', confirm: '' })
  const [submitted, setSubmitted] = useState(false)
  const [serverErrors, setServerErrors] = useState<Errors>({})
  const [banner, setBanner] = useState<string | null>(null)

  const busy = register.isPending || login.isPending

  if (getToken() !== null && !busy) {
    return <Navigate to="/" replace />
  }

  // Client errors show after the first submit, then update as the user types.
  const clientErrors = submitted ? validate(values) : {}
  const errors: Errors = { ...serverErrors, ...clientErrors }

  const set = (field: Field) => (value: string) => {
    setValues((v) => ({ ...v, [field]: value }))
    setServerErrors((e) => ({ ...e, [field]: undefined }))
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setBanner(null)
    const found = validate(values)
    const firstBad = (Object.keys(found) as Field[])[0]
    if (firstBad) {
      document.getElementById(`reg-${firstBad}`)?.focus()
      return
    }

    const body = {
      email: values.email.trim(),
      username: values.username.trim(),
      phone: values.phone,
      password: values.password,
    }
    register.mutate(body, {
      onSuccess: () => {
        // Log straight in; if that fails, send them to the login page with the username filled in.
        login.mutate(
          { identifier: body.username, password: body.password, remember: true },
          { onError: () => navigate('/login', { replace: true, state: { registered: body.username } }) },
        )
      },
      onError: (err) => {
        const { fields, banner } = fromApiError(err)
        setServerErrors(fields)
        setBanner(banner)
        const firstField = (Object.keys(fields) as Field[])[0]
        if (firstField) document.getElementById(`reg-${firstField}`)?.focus()
      },
    })
  }

  return (
    <AuthLayout headline="Start your ledger." lead="Set up your account once. After that, every baht you earn and spend has a place to go.">
      <div className="eyebrow">Create account</div>
      <h2>Make your Passbook</h2>
      <p className="sub">It takes less than a minute.</p>

      <form className="stack" onSubmit={onSubmit} noValidate>
        {banner && (
          <div className="alert" role="alert">
            <span aria-hidden="true">●</span>
            <span>{banner}</span>
          </div>
        )}

        <FormField id="reg-email" label="Email" error={errors.email}>
          {(a11y) => (
            <input {...a11y} className="input" type="email" autoComplete="email" autoFocus placeholder="you@example.com"
              value={values.email} onChange={(e) => set('email')(e.target.value)} />
          )}
        </FormField>

        <FormField id="reg-username" label="Username" error={errors.username} hint="3–30 letters, numbers or _. Starts with a letter.">
          {(a11y) => (
            <input {...a11y} className="input" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="han_w"
              value={values.username} onChange={(e) => set('username')(e.target.value)} />
          )}
        </FormField>

        <FormField id="reg-phone" label="Phone" error={errors.phone}>
          {(a11y) => (
            <input {...a11y} className="input num" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} placeholder="0812345678"
              value={values.phone} onChange={(e) => set('phone')(e.target.value.replace(/\D/g, ''))} />
          )}
        </FormField>

        <FormField id="reg-password" label="Password" error={errors.password} hint="At least 8 characters.">
          {(a11y) => (
            <PasswordInput {...a11y} autoComplete="new-password" value={values.password} onChange={(e) => set('password')(e.target.value)} />
          )}
        </FormField>

        <FormField id="reg-confirm" label="Confirm password" error={errors.confirm}>
          {(a11y) => (
            <PasswordInput {...a11y} autoComplete="new-password" value={values.confirm} onChange={(e) => set('confirm')(e.target.value)} />
          )}
        </FormField>

        <button className="btn" type="submit" disabled={busy}>
          {register.isPending ? 'Creating account…' : login.isPending ? 'Logging in…' : 'Create account'}
        </button>
      </form>

      <p className="switch-auth">
        Already have an account? <Link className="link" to="/login">Log in</Link>
      </p>
    </AuthLayout>
  )
}

interface A11yProps {
  id: string
  'aria-invalid': boolean
  'aria-describedby'?: string
}

function FormField({ id, label, error, hint, children }: {
  id: string
  label: string
  error?: string
  hint?: string
  children: (a11y: A11yProps) => ReactNode
}) {
  const noteId = `${id}-note`
  const note = error ?? hint
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': note ? noteId : undefined })}
      {note && (
        <small id={noteId} className={error ? 'field-error' : 'field-hint'}>
          {note}
        </small>
      )}
    </div>
  )
}

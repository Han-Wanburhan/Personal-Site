import { Navigate, Outlet, useLocation } from 'react-router'

import { useMe } from '../features/auth/hooks'
import { isUnauthorized } from '../lib/api'
import { getToken } from '../lib/token'

// Renders child routes only for a logged-in user; otherwise sends them to /login.
export function ProtectedRoute() {
  const location = useLocation()
  const me = useMe()

  if (getToken() === null || isUnauthorized(me.error)) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (me.isPending) {
    return <div className="center-screen">Loading your ledger…</div>
  }

  if (me.isError) {
    return (
      <div className="center-screen">
        <div className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
          <p>Couldn't load your account. Check that the API is running, then try again.</p>
          <button type="button" className="btn btn-sm" onClick={() => me.refetch()}>
            Try again
          </button>
        </div>
      </div>
    )
  }

  return <Outlet />
}

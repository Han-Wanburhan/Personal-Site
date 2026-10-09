import { NavLink } from 'react-router'

import { useLogout, useMe } from '../features/auth/hooks'
import { ThemeControls } from '../theme/ThemeControls'
import { Brand } from './Brand'

// Top bar shared by the signed-in pages: brand, navigation, theme, user, log out.
// On phones the navigation becomes a bottom tab bar (see .nav in app.css).
export function AppHeader() {
  const { data: user } = useMe()
  const logout = useLogout()
  if (!user) return null

  return (
    <header className="topbar">
      <div className="topbar-left">
        <Brand />
        <nav className="nav" aria-label="Main">
          <NavLink to="/" end>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" />
            </svg>
            <span>Overview</span>
          </NavLink>
          <NavLink to="/transactions">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
            </svg>
            <span>Transactions</span>
          </NavLink>
          <NavLink to="/import">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 4v11m0 0-4-4m4 4 4-4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
            </svg>
            <span>Import</span>
          </NavLink>
        </nav>
      </div>
      <div className="user">
        <ThemeControls />
        <div className="avatar" aria-hidden="true">{user.username.slice(0, 2)}</div>
        <div className="user-meta">
          <b>{user.username}</b>
          <small>{user.email}</small>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
          Log out
        </button>
      </div>
    </header>
  )
}

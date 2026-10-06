import { NavLink } from 'react-router'

import { useLogout, useMe } from '../features/auth/hooks'
import { ThemeControls } from '../theme/ThemeControls'
import { Brand } from './Brand'

// Top bar shared by the signed-in pages: brand, navigation, theme, user, log out.
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
            Overview
          </NavLink>
          <NavLink to="/transactions">Transactions</NavLink>
          <NavLink to="/import">Import</NavLink>
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

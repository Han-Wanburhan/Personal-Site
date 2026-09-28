import type { ReactNode } from 'react'

import { ThemeControls } from '../theme/ThemeControls'
import { Brand } from './Brand'
import { Guilloche } from './Guilloche'

interface Props {
  headline: string
  lead: string
  children: ReactNode
}

// Two-panel shell shared by the login and register pages.
export function AuthLayout({ headline, lead, children }: Props) {
  return (
    <main className="login">
      <section className="login-art">
        <Guilloche />
        <Brand />
        <div className="art-copy">
          <h1>{headline}</h1>
          <p>{lead}</p>
        </div>
        <div className="stub" aria-hidden="true">
          <div className="stub-row"><span className="stub-date num">27/09/26</span><span>Salary</span><span className="num up">+45,000.00</span></div>
          <div className="stub-row"><span className="stub-date num">26/09/26</span><span>Groceries</span><span className="num down">−1,284.50</span></div>
          <div className="stub-row"><span className="stub-date num">25/09/26</span><span>BTS top-up</span><span className="num down">−500.00</span></div>
        </div>
      </section>

      <section className="login-form">
        <ThemeControls />
        {children}
      </section>
    </main>
  )
}

import { useState, type InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'>

// Password field with a Show/Hide button.
export function PasswordInput(props: Props) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="pw">
      <input {...props} className="input" type={visible ? 'text' : 'password'} />
      <button
        type="button"
        aria-label={visible ? 'Hide password' : 'Show password'}
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}

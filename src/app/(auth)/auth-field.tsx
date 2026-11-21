'use client'

import { useId, useState, type ReactNode } from 'react'
import { Eye, EyeOff, Mail } from 'lucide-react'
import { checkoutAr } from '@/i18n/checkout-ar'
import { useT } from '@/i18n/i18n-context'
import styles from './auth.module.css'

type AuthFieldProps = {
  label: string
  type?: 'text' | 'email' | 'password' | 'tel'
  value: string
  onChange: (value: string) => void
  autoComplete: string
  minLength?: number
  maxLength?: number
  action?: ReactNode
}

export default function AuthField({
  label,
  type = 'text',
  value,
  onChange,
  autoComplete,
  minLength,
  maxLength,
  action,
}: AuthFieldProps) {
  const id = useId()
  const { t } = useT()
  const { auth } = t.checkout ?? checkoutAr
  const [visible, setVisible] = useState(false)
  const hasIcon = type === 'email' || type === 'password'

  return (
    <div className={styles.field}>
      <div className={styles.fieldHeader}>
        <label htmlFor={id}>{label}</label>
        {action}
      </div>
      <div className={hasIcon ? `${styles.inputWrap} ${styles.withIcon}` : styles.inputWrap}>
        <input
          id={id}
          type={visible ? 'text' : type}
          dir={type === 'tel' ? 'ltr' : undefined}
          placeholder={type === 'email' ? 'name@example.com' : undefined}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={maxLength}
        />
        {type === 'email' && <Mail aria-hidden="true" className={styles.inputIcon} size={18} strokeWidth={1.6} />}
        {type === 'password' && (
          <button
            type="button"
            className={styles.passwordToggle}
            aria-label={visible ? auth.hidePassword : auth.showPassword}
            onClick={() => setVisible((current) => !current)}
          >
            {visible ? <EyeOff aria-hidden="true" size={19} /> : <Eye aria-hidden="true" size={19} />}
          </button>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

import { useT } from '@/i18n/i18n-context'
import {
  checkoutAr,
  authErrorMessage,
  localizeValidation,
} from '@/i18n/checkout-ar'
import AuthField from '../auth-field'
import styles from '../auth.module.css'

export default function ForgotPasswordPage() {
  const { t, locale } = useT()
  const c = t.checkout ?? checkoutAr
  const [email, setEmail] = useState('')
  const [error, setError] = useState<{
    code?: string
    message?: string
  } | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      setLoading(false)
      setError(error)
      setSuccess(!error)
    } catch {
      setError({})
      setLoading(false)
    }
  }

  return (
    <>
      <h1 id="auth-title" className={styles.title}>{c.auth.forgotTitle}</h1>
      <p className={styles.intro}>{c.auth.forgotDescription}</p>

      <form
        className={styles.form}
        key={locale}
        onInvalid={(event) => localizeValidation(event.target, c)}
        onInput={(event) => localizeValidation(event.target, c, true)}
        onSubmit={handleReset}
      >
        <AuthField label={c.auth.email} type="email" value={email} onChange={setEmail} autoComplete="email" />
        <button className={styles.submit} type="submit" disabled={loading}>
          {loading ? c.auth.sending : c.auth.sendReset}
        </button>
      </form>
      {error && <p role="alert" className={styles.error}>{authErrorMessage(error, c)}</p>}
      {success && <p role="status" className={styles.notice}>{c.auth.resetSent}</p>}

      <div className={styles.footer}>
        <Link href="/login">{c.auth.login}</Link>
      </div>
    </>
  )
}

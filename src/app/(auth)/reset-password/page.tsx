'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

import { useT } from '@/i18n/i18n-context'
import {
  checkoutAr,
  authErrorMessage,
  localizeValidation,
} from '@/i18n/checkout-ar'
import AuthField from '../auth-field'
import styles from '../auth.module.css'

export default function ResetPasswordPage() {
  const { t, locale } = useT()
  const c = t.checkout ?? checkoutAr
  const [password, setPassword] = useState('')
  const [error, setError] = useState<{
    code?: string
    message?: string
  } | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })

      setLoading(false)
      if (error) {
        setError(error)
        return
      }

      setSuccess(true)
      setTimeout(() => router.push('/login'), 2000)
    } catch {
      setError({})
      setLoading(false)
    }
  }

  return (
    <>
      <h1 id="auth-title" className={styles.title}>{c.auth.resetTitle}</h1>
      <p className={styles.intro}>{c.auth.resetDescription}</p>

      <form
        className={styles.form}
        key={locale}
        onInvalid={(event) => localizeValidation(event.target, c)}
        onInput={(event) => localizeValidation(event.target, c, true)}
        onSubmit={handleUpdate}
      >
        <AuthField
          label={c.auth.newPassword}
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          minLength={6}
        />
        <button className={styles.submit} type="submit" disabled={loading}>
          {loading ? c.auth.updating : c.auth.update}
        </button>
      </form>
      {error && <p role="alert" className={styles.error}>{authErrorMessage(error, c)}</p>}
      {success && <p role="status" className={styles.notice}>{c.auth.updated}</p>}
    </>
  )
}

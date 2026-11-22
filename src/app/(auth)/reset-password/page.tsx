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
      // Admin invitations return an implicit session in the URL fragment.
      // Password recovery continues through the existing PKCE flow.
      const url = new URL(window.location.href)
      const invite = new URLSearchParams(url.hash.slice(1))
      const isInvite = invite.get('type') === 'invite'
      if (isInvite || url.searchParams.get('invite') === '1') {
        const accessToken = invite.get('access_token')
        const refreshToken = invite.get('refresh_token')
        if (!isInvite || !accessToken || !refreshToken) {
          setError({ code: 'session_not_found' })
          setLoading(false)
          return
        }
        const { data, error: inviteError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (inviteError || !data.session) {
          setError(inviteError ?? { code: 'session_not_found' })
          setLoading(false)
          return
        }
        url.searchParams.delete('invite')
        window.history.replaceState(window.history.state, '', url.pathname + url.search)
      }

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

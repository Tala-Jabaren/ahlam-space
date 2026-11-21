'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getSafeReturnTo } from '@/lib/safe-return-to'

import { useT } from '@/i18n/i18n-context'
import {
  checkoutAr,
  authErrorMessage,
  localizeValidation,
} from '@/i18n/checkout-ar'
import AuthField from '../auth-field'
import styles from '../auth.module.css'

export default function LoginPage() {
  const { t, locale } = useT()
  const c = t.checkout ?? checkoutAr
  const searchParams = useSearchParams()
  const message = searchParams.get('message')
  const checkEmail = message === 'check-email' || message === 'Check your email to confirm your account'
  const sessionExpired = message === 'session-expired'
  const returnTo = getSafeReturnTo(searchParams.get('returnTo'))
  const signUpHref = returnTo ? `/sign-up?returnTo=${encodeURIComponent(returnTo)}` : '/sign-up'
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<{
    code?: string
    message?: string
  } | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      setLoading(false)

      if (error) {
        setError(error)
        return
      }

      router.replace(returnTo ?? '/member-schedule')
      router.refresh()
    } catch {
      setError({})
      setLoading(false)
    }
  }

  return (
    <>
      <h1 id="auth-title" className={styles.title}>{c.auth.login}</h1>
      <p className={styles.intro}>{c.auth.welcome}</p>

      {checkEmail && <p role="status" className={styles.notice}>{c.auth.checkEmail}</p>}
      {sessionExpired && <p role="alert" className={styles.error}>{c.auth.sessionExpired}</p>}

      <form
        className={styles.form}
        key={locale}
        onInvalid={(event) => localizeValidation(event.target, c)}
        onInput={(event) => localizeValidation(event.target, c, true)}
        onSubmit={handleLogin}
      >
        <AuthField label={c.auth.email} type="email" value={email} onChange={setEmail} autoComplete="email" />
        <AuthField
          label={c.auth.password}
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          action={<Link href="/forgot-password">{c.auth.forgotLink}</Link>}
        />
        {error && <p role="alert" className={styles.error}>{authErrorMessage(error, c)}</p>}
        <button className={styles.submit} type="submit" disabled={loading}>
          {loading ? c.auth.loggingIn : c.auth.login}
          <ArrowRight aria-hidden="true" size={18} />
        </button>
      </form>
      <div className={styles.footer}>
        <Link href={signUpHref}>{c.auth.createAccount}</Link>
      </div>
    </>
  )
}

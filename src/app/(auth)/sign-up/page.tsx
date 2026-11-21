'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
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

const RESEND_COOLDOWN_SECONDS = 60

export default function SignUpPage() {
  const { t, locale } = useT()
  const c = t.checkout ?? checkoutAr
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState<{
    code?: string
    message?: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const returnTo = getSafeReturnTo(searchParams.get('returnTo'))
  const loginHref = returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : '/login'

  // Set once signUp() succeeds, and stays set (never auto-dismissed) until
  // she either leaves the page or taps "تغيير البريد" - signUp() itself,
  // and what it sends, are unchanged; this only decides what we show
  // afterward, in place of navigating straight to /login.
  const [checkEmailFor, setCheckEmailFor] = useState<string | null>(null)
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: `${firstName.trim()} ${lastName.trim()}` },
        },
      })

      setLoading(false)

      if (error) {
        setError(error)
        return
      }

      setCheckEmailFor(email)
    } catch {
      setError({})
      setLoading(false)
    }
  }

  async function handleResend() {
    if (!checkEmailFor || resendState === 'sending' || cooldown > 0) return
    setResendState('sending')

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: checkEmailFor,
      })

      if (error) {
        setResendState('error')
        return
      }

      setResendState('sent')
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch {
      setResendState('error')
    }
  }

  function handleChangeEmail() {
    setCheckEmailFor(null)
    setResendState('idle')
    setCooldown(0)
  }

  if (checkEmailFor) {
    return (
      <>
        <h1 id="auth-title" className={styles.title}>{c.auth.checkEmailTitle}</h1>
        <p role="status" className={styles.notice}>
          {c.auth.checkEmailFor.replace('{email}', checkEmailFor)}
        </p>

        <div className={styles.form}>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendState === 'sending' || cooldown > 0}
            className={styles.submit}
          >
            {resendState === 'sending'
              ? c.auth.sending
              : cooldown > 0
                ? c.auth.resendCooldown.replace('{seconds}', String(cooldown))
                : c.auth.resend}
          </button>
          {resendState === 'sent' && <p role="status" className={styles.notice}>{c.auth.resendSuccess}</p>}
          {resendState === 'error' && <p role="alert" className={styles.error}>{c.auth.resendError}</p>}
        </div>
        <div className={styles.footer}>
          <button type="button" onClick={handleChangeEmail}>{c.auth.changeEmail}</button>
        </div>
      </>
    )
  }

  return (
    <>
      <h1 id="auth-title" className={styles.title}>{c.auth.signup}</h1>
      <p className={styles.intro}>{c.auth.signupDescription}</p>

      <form
        className={styles.form}
        key={locale}
        onInvalid={(event) => localizeValidation(event.target, c)}
        onInput={(event) => localizeValidation(event.target, c, true)}
        onSubmit={handleSignUp}
      >
        <div className={styles.nameFields}>
          <AuthField label={c.order.firstName} value={firstName} onChange={setFirstName} autoComplete="given-name" />
          <AuthField label={c.order.lastName} value={lastName} onChange={setLastName} autoComplete="family-name" />
        </div>
        <AuthField label={c.auth.email} type="email" value={email} onChange={setEmail} autoComplete="email" />
        <AuthField
          label={c.auth.password}
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          minLength={6}
        />
        {error && <p role="alert" className={styles.error}>{authErrorMessage(error, c)}</p>}
        <button className={styles.submit} type="submit" disabled={loading}>
          {loading ? c.auth.creating : c.auth.signup}
        </button>
      </form>

      <div className={styles.footer}>
        <p>{c.auth.haveAccount}</p>
        <Link href={loginHref}>{c.auth.login}</Link>
      </div>
    </>
  )
}

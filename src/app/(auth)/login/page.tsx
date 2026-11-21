'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Eye, EyeOff, Leaf, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getSafeReturnTo } from '@/lib/safe-return-to'

import { useT } from '@/i18n/i18n-context'
import {
  checkoutAr,
  authErrorMessage,
  localizeValidation,
} from '@/i18n/checkout-ar'
import styles from './login.module.css'

export default function LoginPage() {
  const { t, locale, dir } = useT()
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
  const [passwordVisible, setPasswordVisible] = useState(false)
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
    <main dir={dir} className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.panel} aria-labelledby="login-title">
          <div className={styles.content}>
            <Link href="/" className={styles.brand} lang="en" dir="ltr">
              <span><Leaf aria-hidden="true" size={17} strokeWidth={1.6} /></span>
              Ahlam Space
            </Link>
            <h1 id="login-title" className={styles.title}>{c.auth.login}</h1>
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
              <div className={styles.field}>
                <label htmlFor="login-email">{c.auth.email}</label>
                <div className={styles.inputWrap}>
                  <input
                    id="login-email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                  />
                  <Mail aria-hidden="true" className={styles.inputIcon} size={18} strokeWidth={1.6} />
                </div>
              </div>
              <div className={styles.field}>
                <div className={styles.fieldHeader}>
                  <label htmlFor="login-password">{c.auth.password}</label>
                  <Link href="/forgot-password">{c.auth.forgotLink}</Link>
                </div>
                <div className={styles.inputWrap}>
                  <input
                    id="login-password"
                    type={passwordVisible ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    aria-label={passwordVisible ? c.auth.hidePassword : c.auth.showPassword}
                    onClick={() => setPasswordVisible((visible) => !visible)}
                  >
                    {passwordVisible ? <EyeOff aria-hidden="true" size={19} /> : <Eye aria-hidden="true" size={19} />}
                  </button>
                </div>
              </div>
              {error && <p role="alert" className={styles.error}>{authErrorMessage(error, c)}</p>}
              <button className={styles.submit} type="submit" disabled={loading}>
                {loading ? c.auth.loggingIn : c.auth.login}
                <ArrowRight aria-hidden="true" size={18} />
              </button>
            </form>
            <div className={styles.signup}>
              <Link href={signUpHref}>{c.auth.createAccount}</Link>
            </div>
          </div>
        </section>
        <div className={styles.art}>
          <p>{c.auth.loginArtCaption}</p>
        </div>
      </div>
    </main>
  )
}

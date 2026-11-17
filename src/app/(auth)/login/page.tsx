'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getSafeReturnTo } from '@/lib/safe-return-to'

import { useT } from '@/i18n/i18n-context'
import {
  checkoutAr,
  authErrorMessage,
  localizeValidation,
} from '@/i18n/checkout-ar'

export default function LoginPage() {
  const { t, locale, dir } = useT()
  const c = t.checkout ?? checkoutAr
  const checkEmail = useSyncExternalStore(
    () => () => {},
    () =>
      ['check-email', 'Check your email to confirm your account'].includes(
        new URLSearchParams(window.location.search).get('message') ?? '',
      ),
    () => false,
  )
  // Set by the member layout (and the account/bookings pages' own fallback
  // checks) when a session couldn't be verified server-side - it used to
  // bounce straight to a blank login form with no explanation at all.
  const sessionExpired = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get('message') === 'session-expired',
    () => false,
  )
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<{
    code?: string
    message?: string
  } | null>(null)
  const [loading, setLoading] = useState(false)

  function handleCreateAccount(event: React.MouseEvent<HTMLAnchorElement>) {
    const returnTo = getSafeReturnTo(
      new URLSearchParams(window.location.search).get('returnTo'),
    )
    if (!returnTo) return

    event.preventDefault()
    router.push(`/sign-up?returnTo=${encodeURIComponent(returnTo)}`)
  }

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

      const returnTo =
        getSafeReturnTo(
          new URLSearchParams(window.location.search).get('returnTo'),
        ) ?? '/member-schedule'

      router.replace(returnTo)
      router.refresh()
    } catch {
      setError({})
      setLoading(false)
    }
  }

  return (
    <main
      dir={dir}
      className="flex min-h-screen items-center justify-center bg-[#F7F6F0] px-5 py-12 text-[#25311f] sm:px-8"
    >
      <section className="w-full max-w-md rounded-[2rem] border border-[#617A55]/10 bg-white/70 p-6 shadow-sm sm:p-8">
        <div className="space-y-3 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#617A55]">
            {c.auth.memberAccess}
          </p>
          <h1 className="font-serif text-4xl leading-tight sm:text-5xl">
            {c.auth.login}
          </h1>
          <p className="text-sm leading-6 text-[#4f5d49]">{c.auth.welcome}</p>
        </div>

        {checkEmail && (
          <p
            role="status"
            className="mt-5 rounded-2xl bg-[#D6E2B6]/70 p-4 text-sm text-[#4f5d49]"
          >
            {c.auth.checkEmail}
          </p>
        )}
        {sessionExpired && (
          <p
            role="alert"
            className="mt-5 rounded-2xl bg-red-50 p-4 text-sm leading-6 text-red-700"
          >
            {c.auth.sessionExpired}
          </p>
        )}
        <form
          className="mt-8 grid gap-5"
          key={locale}
          onInvalid={(event) => localizeValidation(event.target, c)}
          onInput={(event) => localizeValidation(event.target, c, true)}
          onSubmit={handleLogin}
        >
          <label className="grid gap-2 text-sm font-medium text-[#617A55]">
            {c.auth.email}
            <input
              className="min-h-11 min-w-0 w-full rounded-2xl border border-[#617A55]/20 bg-[#F7F6F0] px-4 py-3 text-[#25311f] outline-none transition placeholder:text-[#617A55]/55 focus:border-[#617A55]"
              type="email"
              placeholder={c.auth.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-[#617A55]">
            {c.auth.password}
            <input
              className="min-h-11 min-w-0 w-full rounded-2xl border border-[#617A55]/20 bg-[#F7F6F0] px-4 py-3 text-[#25311f] outline-none transition placeholder:text-[#617A55]/55 focus:border-[#617A55]"
              type="password"
              placeholder={c.auth.password}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          {error && (
            <p
              role="alert"
              className="rounded-2xl bg-red-50 p-4 text-sm leading-6 text-red-700"
            >
              {authErrorMessage(error, c)}
            </p>
          )}
          <button
            className="min-h-11 rounded-full bg-[#617A55] px-7 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[#4f6645] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? c.auth.loggingIn : c.auth.login}
          </button>
        </form>
        <div className="mt-6 flex flex-col gap-2 text-center text-sm text-[#4f5d49]">
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-full px-4 font-medium text-[#617A55] underline-offset-4 transition hover:bg-[#D6E2B6]/50 hover:text-[#25311f] hover:underline"
            href="/forgot-password"
          >
            {c.auth.forgotLink}
          </Link>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-full px-4 font-medium text-[#617A55] underline-offset-4 transition hover:bg-[#D6E2B6]/50 hover:text-[#25311f] hover:underline"
            href="/sign-up"
            onClick={handleCreateAccount}
          >
            {c.auth.createAccount}
          </Link>
        </div>
      </section>
    </main>
  )
}

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

export default function ResetPasswordPage() {
  const { t, locale, dir } = useT()
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
    <main
      dir={dir}
      className="flex min-h-screen items-center justify-center bg-[#F7F6F0] px-5 py-12 text-[#25311f] sm:px-8"
    >
      <section className="w-full max-w-md rounded-[2rem] border border-[#617A55]/10 bg-white/70 p-6 shadow-sm sm:p-8">
        <div className="space-y-3 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#617A55]">
            {c.auth.help}
          </p>
          <h1 className="font-serif text-4xl leading-tight sm:text-5xl">
            {c.auth.resetTitle}
          </h1>
          <p className="text-sm leading-6 text-[#4f5d49]">
            {c.auth.resetDescription}
          </p>
        </div>

        <form
          className="mt-8 grid gap-5"
          key={locale}
          onInvalid={(event) => localizeValidation(event.target, c)}
          onInput={(event) => localizeValidation(event.target, c, true)}
          onSubmit={handleUpdate}
        >
          <label className="grid gap-2 text-sm font-medium text-[#617A55]">
            {c.auth.newPassword}
            <input
              className="min-h-11 min-w-0 w-full rounded-2xl border border-[#617A55]/20 bg-[#F7F6F0] px-4 py-3 text-[#25311f] outline-none transition placeholder:text-[#617A55]/55 focus:border-[#617A55]"
              type="password"
              placeholder={c.auth.newPassword}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </label>
          <button
            className="min-h-11 rounded-full bg-[#617A55] px-7 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[#4f6645]"
            type="submit"
            disabled={loading}
          >
            {loading ? c.auth.updating : c.auth.update}
          </button>
        </form>
        {(success || error) && (
          <p
            role={error ? 'alert' : 'status'}
            className={`mt-5 rounded-2xl p-4 text-sm leading-6 ${
              success
                ? 'bg-[#D6E2B6]/70 text-[#4f5d49]'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {error ? authErrorMessage(error, c) : c.auth.updated}
          </p>
        )}
      </section>
    </main>
  )
}

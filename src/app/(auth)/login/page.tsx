'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function handleCreateAccount(event: React.MouseEvent<HTMLAnchorElement>) {
    const requestedReturnTo = new URLSearchParams(window.location.search).get(
      'returnTo'
    )

    if (
      !requestedReturnTo?.startsWith('/') ||
      requestedReturnTo.startsWith('//')
    ) {
      return
    }

    event.preventDefault()
    router.push(`/sign-up?returnTo=${encodeURIComponent(requestedReturnTo)}`)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    const requestedReturnTo = new URLSearchParams(window.location.search).get(
      'returnTo'
    )
    const returnTo =
      requestedReturnTo?.startsWith('/') && !requestedReturnTo.startsWith('//')
        ? requestedReturnTo
        : '/member-schedule'

    router.replace(returnTo)
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F6F0] px-5 py-12 text-[#25311f] sm:px-8">
      <section className="w-full max-w-md rounded-[2rem] border border-[#617A55]/10 bg-white/70 p-6 shadow-sm sm:p-8">
        <div className="space-y-3 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#617A55]">
            Member access
          </p>
          <h1 className="font-serif text-4xl leading-tight sm:text-5xl">
            Login
          </h1>
          <p className="text-sm leading-6 text-[#4f5d49]">
            Welcome back to Ahlam Space.
          </p>
        </div>

        <form className="mt-8 grid gap-5" onSubmit={handleLogin}>
          <label className="grid gap-2 text-sm font-medium text-[#617A55]">
            Email
            <input
              className="min-h-11 rounded-2xl border border-[#617A55]/20 bg-[#F7F6F0] px-4 py-3 text-[#25311f] outline-none transition placeholder:text-[#617A55]/55 focus:border-[#617A55]"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-[#617A55]">
            Password
            <input
              className="min-h-11 rounded-2xl border border-[#617A55]/20 bg-[#F7F6F0] px-4 py-3 text-[#25311f] outline-none transition placeholder:text-[#617A55]/55 focus:border-[#617A55]"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          {error && (
            <p className="rounded-2xl bg-red-50 p-4 text-sm leading-6 text-red-700">
              {error}
            </p>
          )}
          <button
            className="min-h-11 rounded-full bg-[#617A55] px-7 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[#4f6645] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <div className="mt-6 flex flex-col gap-2 text-center text-sm text-[#4f5d49]">
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-full px-4 font-medium text-[#617A55] underline-offset-4 transition hover:bg-[#D6E2B6]/50 hover:text-[#25311f] hover:underline"
            href="/forgot-password"
          >
            Forgot password?
          </Link>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-full px-4 font-medium text-[#617A55] underline-offset-4 transition hover:bg-[#D6E2B6]/50 hover:text-[#25311f] hover:underline"
            href="/sign-up"
            onClick={handleCreateAccount}
          >
            Create an account
          </Link>
        </div>
      </section>
    </main>
  )
}

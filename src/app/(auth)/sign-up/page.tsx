'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    router.push('/login?message=Check your email to confirm your account')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F6F0] px-5 py-12 text-[#25311f] sm:px-8">
      <section className="w-full max-w-md rounded-[2rem] border border-[#617A55]/10 bg-white/70 p-6 shadow-sm sm:p-8">
        <div className="space-y-3 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#617A55]">
            Join the studio
          </p>
          <h1 className="font-serif text-4xl leading-tight sm:text-5xl">
            Sign Up
          </h1>
          <p className="text-sm leading-6 text-[#4f5d49]">
            Create your Ahlam Space member account.
          </p>
        </div>

        <form className="mt-8 grid gap-5" onSubmit={handleSignUp}>
          <label className="grid gap-2 text-sm font-medium text-[#617A55]">
            Full name
            <input
              className="min-h-11 rounded-2xl border border-[#617A55]/20 bg-[#F7F6F0] px-4 py-3 text-[#25311f] outline-none transition placeholder:text-[#617A55]/55 focus:border-[#617A55]"
              type="text"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
            />
          </label>
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
              minLength={6}
              autoComplete="new-password"
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
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
        <div className="mt-6 flex flex-col items-center gap-2 text-center text-sm text-[#4f5d49]">
          <p>Already have an account?</p>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-full px-4 font-medium text-[#617A55] underline-offset-4 transition hover:bg-[#D6E2B6]/50 hover:text-[#25311f] hover:underline"
            href="/login"
          >
            Login
          </Link>
        </div>
      </section>
    </main>
  )
}

'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setMessage(error ? error.message : 'Check your email for a reset link.')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F6F0] px-5 py-12 text-[#25311f] sm:px-8">
      <section className="w-full max-w-md rounded-[2rem] border border-[#617A55]/10 bg-white/70 p-6 shadow-sm sm:p-8">
        <div className="space-y-3 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#617A55]">
            Account help
          </p>
          <h1 className="font-serif text-4xl leading-tight sm:text-5xl">
            Forgot Password
          </h1>
          <p className="text-sm leading-6 text-[#4f5d49]">
            We&apos;ll send a secure reset link to your email.
          </p>
        </div>

        <form className="mt-8 grid gap-5" onSubmit={handleReset}>
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
          <button
            className="min-h-11 rounded-full bg-[#617A55] px-7 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[#4f6645]"
            type="submit"
          >
            Send reset link
          </button>
        </form>
        {message && (
          <p
            className={`mt-5 rounded-2xl p-4 text-sm leading-6 ${
              message === 'Check your email for a reset link.'
                ? 'bg-[#D6E2B6]/70 text-[#4f5d49]'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {message}
          </p>
        )}
      </section>
    </main>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Password updated. Redirecting to login...')
    setTimeout(() => router.push('/login'), 2000)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F6F0] px-5 py-12 text-[#25311f] sm:px-8">
      <section className="w-full max-w-md rounded-[2rem] border border-[#617A55]/10 bg-white/70 p-6 shadow-sm sm:p-8">
        <div className="space-y-3 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#617A55]">
            Account help
          </p>
          <h1 className="font-serif text-4xl leading-tight sm:text-5xl">
            Reset Password
          </h1>
          <p className="text-sm leading-6 text-[#4f5d49]">
            Choose a new password for your member account.
          </p>
        </div>

        <form className="mt-8 grid gap-5" onSubmit={handleUpdate}>
          <label className="grid gap-2 text-sm font-medium text-[#617A55]">
            New password
            <input
              className="min-h-11 rounded-2xl border border-[#617A55]/20 bg-[#F7F6F0] px-4 py-3 text-[#25311f] outline-none transition placeholder:text-[#617A55]/55 focus:border-[#617A55]"
              type="password"
              placeholder="New password"
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
          >
            Update password
          </button>
        </form>
        {message && (
          <p
            className={`mt-5 rounded-2xl p-4 text-sm leading-6 ${
              message === 'Password updated. Redirecting to login...'
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

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
    <div style={{ maxWidth: 400, margin: '40px auto' }}>
      <h1>Forgot Password</h1>
      <form onSubmit={handleReset}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit">Send reset link</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  )
}

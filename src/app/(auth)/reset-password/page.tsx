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
    <div style={{ maxWidth: 400, margin: '40px auto' }}>
      <h1>Reset Password</h1>
      <form onSubmit={handleUpdate}>
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        <button type="submit">Update password</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  )
}

'use client'

import { useState } from 'react'

type ContactResponse = {
  success?: boolean
  error?: string
}

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus(null)
    setLoading(true)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, message }),
      })
      const result = (await response.json()) as ContactResponse

      if (!response.ok || !result.success) {
        setStatus(result.error ?? 'Unable to send message.')
        return
      }

      setName('')
      setEmail('')
      setMessage('')
      setStatus('Message sent.')
    } catch {
      setStatus('Unable to send message.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-5 py-16 sm:px-8 lg:px-10">
      <section className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-6">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#617A55]">
            Contact
          </p>
          <h1 className="font-serif text-5xl leading-tight text-[#25311f] sm:text-6xl">
            Tell us what you&apos;re looking for.
          </h1>
          <p className="text-lg leading-8 text-[#4f5d49]">
            Ask about classes, private sessions, products, or finding the right
            place to begin.
          </p>
          <div className="min-h-64 rounded-[2rem] bg-[#C7D6E8] p-5">
            <div className="h-full min-h-56 rounded-[1.5rem] bg-[#F7F6F0]/55" />
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[2rem] border border-[#617A55]/10 bg-white/70 p-6 shadow-sm sm:p-8"
        >
          <div className="grid gap-5">
            <label className="grid gap-2 text-sm font-medium text-[#617A55]">
              Name
              <input
                className="rounded-2xl border border-[#617A55]/20 bg-[#F7F6F0] px-4 py-3 text-[#25311f] outline-none transition placeholder:text-[#617A55]/55 focus:border-[#617A55]"
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-[#617A55]">
              Email
              <input
                className="rounded-2xl border border-[#617A55]/20 bg-[#F7F6F0] px-4 py-3 text-[#25311f] outline-none transition placeholder:text-[#617A55]/55 focus:border-[#617A55]"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-[#617A55]">
              Message
              <textarea
                className="min-h-40 rounded-2xl border border-[#617A55]/20 bg-[#F7F6F0] px-4 py-3 text-[#25311f] outline-none transition placeholder:text-[#617A55]/55 focus:border-[#617A55]"
                placeholder="Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </label>
            <button
              className="rounded-full bg-[#617A55] px-7 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[#4f6645] disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send message'}
            </button>
          </div>
          {status && (
            <p className="mt-5 rounded-2xl bg-[#D6E2B6]/70 p-4 text-[#4f5d49]">
              {status}
            </p>
          )}
        </form>
      </section>
    </div>
  )
}

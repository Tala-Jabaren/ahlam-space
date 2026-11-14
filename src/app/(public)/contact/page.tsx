'use client'

import { useState } from 'react'
import { MessageCircle, Phone } from 'lucide-react'
import { useT } from '@/i18n/i18n-context'
import { PHONE_DISPLAY, PHONE_E164, WHATSAPP_URL } from '@/content/site-contact'

type ContactResponse = {
  success?: boolean
  error?: string
}

export default function ContactPage() {
  const { t, dir } = useT()
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
        setStatus(result.error ?? t.contact.genericError)
        return
      }

      setName('')
      setEmail('')
      setMessage('')
      setStatus(t.contact.sentMessage)
    } catch {
      setStatus(t.contact.genericError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-5 py-16 sm:px-8 lg:px-10" dir={dir}>
      <section className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-6">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#617A55]">
            {t.contact.eyebrow}
          </p>
          <h1 className="font-serif text-5xl leading-tight text-[#25311f] sm:text-6xl">
            {t.contact.heading}
          </h1>
          <p className="text-lg leading-8 text-[#4f5d49]">{t.contact.paragraph}</p>
          <div className="min-h-64 rounded-[2rem] bg-[#C7D6E8] p-5">
            <div className="flex h-full min-h-56 flex-col justify-center gap-4 rounded-[1.5rem] bg-[#F7F6F0]/55 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#4f5d49]">
                {t.contact.directContactLabel}
              </p>
              <a
                href={`tel:${PHONE_E164}`}
                className="flex items-center gap-2 text-lg font-semibold text-[#25311f] underline-offset-4 hover:underline"
              >
                <Phone aria-hidden="true" className="size-5 shrink-0" />
                <span>{t.contact.phoneLabel}:</span>
                <bdi dir="ltr">{PHONE_DISPLAY}</bdi>
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-lg font-semibold text-[#25311f] underline-offset-4 hover:underline"
              >
                <MessageCircle aria-hidden="true" className="size-5 shrink-0" />
                {t.contact.whatsappLink}
              </a>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[2rem] border border-[#617A55]/10 bg-white/70 p-6 shadow-sm sm:p-8"
        >
          <div className="grid gap-5">
            <label className="grid gap-2 text-sm font-medium text-[#617A55]">
              {t.contact.nameLabel}
              <input
                className="rounded-2xl border border-[#617A55]/20 bg-[#F7F6F0] px-4 py-3 text-[#25311f] outline-none transition placeholder:text-[#617A55]/55 focus:border-[#617A55]"
                type="text"
                placeholder={t.contact.namePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-[#617A55]">
              {t.contact.emailLabel}
              <input
                className="rounded-2xl border border-[#617A55]/20 bg-[#F7F6F0] px-4 py-3 text-[#25311f] outline-none transition placeholder:text-[#617A55]/55 focus:border-[#617A55]"
                type="email"
                placeholder={t.contact.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-[#617A55]">
              {t.contact.messageLabel}
              <textarea
                className="min-h-40 rounded-2xl border border-[#617A55]/20 bg-[#F7F6F0] px-4 py-3 text-[#25311f] outline-none transition placeholder:text-[#617A55]/55 focus:border-[#617A55]"
                placeholder={t.contact.messagePlaceholder}
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
              {loading ? t.contact.sending : t.contact.send}
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

'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/i18n/i18n-context'
import { ar } from '@/i18n/ar'
import ClassesBanner from '@/components/classes/classes-banner'
import { studioMinute } from '@/lib/private-session-preferences'
import PrivateSessionCard from './private-session-card'
import PreferredTimes from './preferred-times'

const SERVICE_IMAGES = [
  '/images/about2.png',
  '/member/yoga-class.png',
  '/member/fitness-class.png',
] as const

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'past-times' | 'error'

export default function PrivateSessionsPage() {
  const { t, dir } = useT()
  // `value` is always the Arabic title, regardless of the active language -
  // it's what gets stored in session_requests.session_type, and the owner
  // needs one consistent value per service there no matter which language
  // the visitor filled the form in. `title`/`description` are the localized
  // display text only.
  const SERVICES = t.privateSessions.services.map((service, index) => ({
    ...service,
    image: SERVICE_IMAGES[index],
    value: ar.privateSessions.services[index].title,
    isPrivateSession: index === 2,
    isSoundHealing: index === 1,
  }))
  const formRef = useRef<HTMLFormElement>(null)
  const [sessionType, setSessionType] = useState<string>(SERVICES[0].value)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [preferredSlots, setPreferredSlots] = useState<string[]>([])
  const [status, setStatus] = useState<SubmitStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  function handleRequestClick(serviceValue: string) {
    setSessionType(serviceValue)
    formRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const now = studioMinute()
    if (preferredSlots.some((slot) => slot <= now)) {
      setStatus('past-times')
      return
    }
    setStatus('submitting')
    setErrorMessage(null)

    const supabase = createClient()
    const { error } = await supabase.from('session_requests').insert({
      session_type: sessionType,
      full_name: fullName,
      phone,
      email: email || null,
      message: message || null,
      preferred_slots: preferredSlots,
    })

    if (error) {
      setStatus('error')
      setErrorMessage(error.message)
      return
    }

    setStatus('success')
    setFullName('')
    setPhone('')
    setEmail('')
    setMessage('')
    setPreferredSlots([])
  }

  return (
    <div dir={dir} className="text-[#25311f] [&_form>h2]:font-serif [&_form>h2]:text-4xl [&_form>h2]:text-[#25311f]">
      <ClassesBanner title={t.privateSessions.heading} tagline={t.privateSessions.tagline} />

      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
        <div className="grid gap-6 xl:grid-cols-2 xl:justify-items-center">
          {SERVICES.map((service) => (
            <PrivateSessionCard
              key={service.value}
              title={service.title}
              isPrivateSession={service.isPrivateSession}
              isSoundHealing={service.isSoundHealing}
              image={service.image}
              description={service.description}
              requestLabel={t.privateSessions.requestButton}
              onRequest={() => handleRequestClick(service.value)}
            />
          ))}
        </div>

        <hr className="my-12 border-[#617A55]/15" />

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="mx-auto max-w-3xl rounded-[2rem] border border-[#617A55]/10 bg-white/70 p-6 shadow-sm sm:p-8"
        >
          <h2>{t.privateSessions.formHeading}</h2>

          <div className="mt-6 grid gap-2 text-sm font-medium text-[#617A55]">
            <label htmlFor="session_type">{t.privateSessions.sessionTypeLabel}</label>
            <select
              className="rounded-2xl border border-[#617A55]/20 bg-[#F7F6F0] px-4 py-3 text-[#25311f] outline-none transition focus:border-[#617A55]"
              id="session_type"
              value={sessionType}
              onChange={(e) => setSessionType(e.target.value)}
            >
              {SERVICES.map((service) => (
                <option key={service.value} value={service.value}>
                  {service.title}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5 grid gap-2 text-sm font-medium text-[#617A55]">
            <label htmlFor="full_name">{t.privateSessions.fullNameLabel}</label>
            <input
              className="rounded-2xl border border-[#617A55]/20 bg-[#F7F6F0] px-4 py-3 text-[#25311f] outline-none transition focus:border-[#617A55]"
              id="full_name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="mt-5 grid gap-2 text-sm font-medium text-[#617A55]">
            <label htmlFor="phone">{t.privateSessions.phoneLabel}</label>
            <input
              className="rounded-2xl border border-[#617A55]/20 bg-[#F7F6F0] px-4 py-3 text-[#25311f] outline-none transition focus:border-[#617A55]"
              id="phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="mt-5 grid gap-2 text-sm font-medium text-[#617A55]">
            <label htmlFor="email">{t.privateSessions.emailLabel}</label>
            <input
              className="rounded-2xl border border-[#617A55]/20 bg-[#F7F6F0] px-4 py-3 text-[#25311f] outline-none transition focus:border-[#617A55]"
              id="email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <PreferredTimes
            slots={preferredSlots}
            onChange={(slots) => {
              setPreferredSlots(slots)
              if (status === 'past-times' || status === 'success') setStatus('idle')
            }}
            disabled={status === 'submitting'}
          />

          <div className="mt-5 grid gap-2 text-sm font-medium text-[#617A55]">
            <label htmlFor="message">{t.privateSessions.messageLabel}</label>
            <textarea
              className="min-h-36 rounded-2xl border border-[#617A55]/20 bg-[#F7F6F0] px-4 py-3 text-[#25311f] outline-none transition placeholder:text-[#617A55]/55 focus:border-[#617A55]"
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t.privateSessions.messagePlaceholder}
            />
          </div>

          <button
            className="mt-6 rounded-full bg-[#617A55] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#4f6645] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={status === 'submitting'}
          >
            {status === 'submitting' ? t.privateSessions.submitting : t.privateSessions.submit}
          </button>

          {status === 'success' && <p role="status" className="mt-3 text-sm text-[#465d3d]">{t.privateSessions.successMessage}</p>}
          {status === 'past-times' && <p role="alert" className="mt-3 text-sm text-red-700">{t.privateSessions.availability.past}</p>}
          {status === 'error' && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {t.privateSessions.errorPrefix}
              {errorMessage ? `: ${errorMessage}` : ''}
              {t.privateSessions.errorSuffix}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}

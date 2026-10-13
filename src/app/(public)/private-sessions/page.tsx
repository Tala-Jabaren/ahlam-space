'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/i18n/i18n-context'
import { ar } from '@/i18n/ar'
import PrivateSessionCard from './private-session-card'

const SERVICE_IMAGES = [
  '/images/about2.png',
  '/member/yoga-class.png',
  '/member/fitness-class.png',
] as const

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error'

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
    hasDetails: index === 2,
  }))
  const formRef = useRef<HTMLFormElement>(null)
  const [sessionType, setSessionType] = useState<string>(SERVICES[0].value)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<SubmitStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  function handleRequestClick(serviceValue: string) {
    setSessionType(serviceValue)
    formRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    setErrorMessage(null)

    const supabase = createClient()
    const { error } = await supabase.from('session_requests').insert({
      session_type: sessionType,
      full_name: fullName,
      phone,
      email: email || null,
      message: message || null,
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
  }

  return (
    <div
      dir={dir}
      className="mx-auto max-w-7xl px-5 py-16 text-[#25311f] sm:px-8 lg:px-10 [&_h1]:mb-10 [&_h1]:font-serif [&_h1]:text-5xl [&_h1]:leading-tight [&_h1]:text-[#25311f] [&_form>h2]:font-serif [&_form>h2]:text-4xl [&_form>h2]:text-[#25311f]"
    >
      <h1>{t.privateSessions.heading}</h1>

      <div className="grid gap-6 xl:grid-cols-2 xl:justify-items-center">
        {SERVICES.map((service) => service.hasDetails ? (
          <PrivateSessionCard
            key={service.value}
            image={service.image}
            description={service.description}
            requestLabel={t.privateSessions.requestButton}
            onRequest={() => handleRequestClick(service.value)}
          />
        ) : (
          <section
            key={service.value}
            className="flex h-auto w-full max-w-[620px] flex-col overflow-hidden rounded-[18px] border border-[#617A55]/[0.12] bg-white transition-transform duration-200 hover:-translate-y-[3px] sm:h-[190px] sm:flex-row"
          >
            <div className="relative h-[210px] w-full shrink-0 sm:h-full sm:w-[190px]">
              <Image
                src={service.image}
                alt=""
                fill
                sizes="(min-width: 640px) 190px, 100vw"
                className="object-cover object-center"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col p-5">
              <h2 className="font-serif text-2xl font-medium leading-tight text-[#25311f]">
                {service.title}
              </h2>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#4f5d49]">
                {service.description}
              </p>
              <button
                className="mt-auto self-start rounded-full bg-[#D6E2B6] px-7 py-2.5 text-sm font-medium text-[#617A55] transition-colors hover:bg-[#cbd9a7]"
                type="button"
                onClick={() => handleRequestClick(service.value)}
              >
                {t.privateSessions.requestButton}
              </button>
            </div>
          </section>
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

        {status === 'success' && <p>{t.privateSessions.successMessage}</p>}
        {status === 'error' && (
          <p>
            {t.privateSessions.errorPrefix}
            {errorMessage ? `: ${errorMessage}` : ''}
            {t.privateSessions.errorSuffix}
          </p>
        )}
      </form>
    </div>
  )
}

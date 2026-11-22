'use client'

import { X } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/i18n/i18n-context'
import type { PrivateSessionService } from '@/lib/private-session-services'
import { privateSessionImageSrc } from '@/lib/private-session-images'
import ClassesBanner from '@/components/classes/classes-banner'
import { studioMinute } from '@/lib/private-session-preferences'
import PrivateSessionCard from './private-session-card'
import PreferredTimes from './preferred-times'

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'past-times' | 'error'

export default function PrivateSessionsClient({ catalog, bookingInDialog }: { catalog: PrivateSessionService[]; bookingInDialog: boolean }) {
  const { t, dir, locale } = useT()
  const services = catalog.map((service) => ({
    ...service,
    title: locale === 'en' ? service.title_en || service.title_ar : service.title_ar,
    description: locale === 'en' ? service.description_en || service.description_ar : service.description_ar,
    duration: locale === 'en' ? service.duration_en || service.duration_ar : service.duration_ar,
  }))
  const formRef = useRef<HTMLFormElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [selectedId, setSelectedId] = useState<number>()
  const selectedService = services.find((service) => service.id === selectedId) ?? services[0]
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [preferredSlots, setPreferredSlots] = useState<string[]>([])
  const [status, setStatus] = useState<SubmitStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  function handleRequestClick(serviceId: number) {
    setSelectedId(serviceId)
    if (bookingInDialog) {
      if (status === 'success') setStatus('idle')
      dialogRef.current?.showModal()
      return
    }
    formRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedService || status === 'submitting') return
    const now = studioMinute()
    if (preferredSlots.some((slot) => slot <= now)) {
      setStatus('past-times')
      return
    }
    setStatus('submitting')
    setErrorMessage(null)

    const supabase = createClient()
    const { error } = await supabase.from('session_requests').insert({
      session_type: selectedService.title_ar,
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

  const form = (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className={bookingInDialog ? 'min-w-0 px-4 pb-6 sm:px-6' : 'mx-auto max-w-3xl rounded-[2rem] border border-[#617A55]/10 bg-white/70 p-6 shadow-sm sm:p-8'}
    >
      {!bookingInDialog && <h2 className="font-serif text-4xl text-[#25311f]">{t.privateSessions.formHeading}</h2>}

      <div className="mt-6 grid gap-2 text-sm font-medium text-[#617A55]">
        <label htmlFor="session_type">{t.privateSessions.sessionTypeLabel}</label>
        <select
          className="min-w-0 w-full rounded-2xl border border-[#617A55]/20 bg-[#F7F6F0] px-4 py-3 text-[#25311f] outline-none transition focus:border-[#617A55]"
          id="session_type"
          value={selectedService?.id ?? ''}
          onChange={(e) => setSelectedId(Number(e.target.value))}
        >
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.title}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5 grid gap-2 text-sm font-medium text-[#617A55]">
        <label htmlFor="full_name">{t.privateSessions.fullNameLabel}</label>
        <input
          className="min-w-0 w-full rounded-2xl border border-[#617A55]/20 bg-[#F7F6F0] px-4 py-3 text-[#25311f] outline-none transition focus:border-[#617A55]"
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
          className="min-w-0 w-full rounded-2xl border border-[#617A55]/20 bg-[#F7F6F0] px-4 py-3 text-[#25311f] outline-none transition focus:border-[#617A55]"
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
          className="min-w-0 w-full rounded-2xl border border-[#617A55]/20 bg-[#F7F6F0] px-4 py-3 text-[#25311f] outline-none transition focus:border-[#617A55]"
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
        disabled={status === 'submitting' || !selectedService}
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
        disabled={status === 'submitting' || !selectedService}
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
  )

  return (
    <div dir={dir} className="text-[#25311f]">
      <ClassesBanner title={t.privateSessions.heading} tagline={t.privateSessions.tagline} />

      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
        <div className="grid gap-6 xl:grid-cols-2 xl:justify-items-center">
          {services.map((service) => (
            <PrivateSessionCard
              key={service.id}
              title={service.title}
              price={service.price}
              hourly={service.hourly}
              duration={service.duration}
              image={privateSessionImageSrc(service.image)}
              description={service.description}
              requestLabel={t.privateSessions.requestButton}
              bookingInDialog={bookingInDialog}
              onRequest={() => handleRequestClick(service.id)}
            />
          ))}
        </div>

        {bookingInDialog ? (
          <dialog
            ref={dialogRef}
            aria-labelledby={titleId}
            className="fixed inset-0 m-auto max-h-[calc(100dvh_-_1rem)] w-[calc(100%_-_1rem)] max-w-2xl overflow-y-auto overscroll-contain rounded-2xl border border-[#617A55]/20 bg-white p-0 text-[#25311f] shadow-xl backdrop:bg-[#25311f]/45"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#617A55]/15 bg-white px-4 py-3 sm:px-6">
              <h2 id={titleId} className="font-serif text-2xl">{t.privateSessions.formHeading}</h2>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                aria-label={t.classCards.close}
                className="grid size-11 shrink-0 place-items-center rounded-full border border-[#617A55]/25 text-[#465d3d] hover:bg-[#D6E2B6]/50 focus-visible:outline-2"
              >
                <X size={19} aria-hidden="true" />
              </button>
            </div>
            {form}
          </dialog>
        ) : (
          <>
            <hr className="my-12 border-[#617A55]/15" />
            {form}
          </>
        )}
      </div>
    </div>
  )
}

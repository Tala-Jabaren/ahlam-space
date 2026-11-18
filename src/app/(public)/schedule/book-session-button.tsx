'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PaymentConfirmationBlock from '@/components/payment-confirmation-block'
import { WHATSAPP_URL } from '@/content/site-contact'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/i18n/i18n-context'
import type { BookingReceipt } from '@/components/classes/types'

type Props = {
  sessionId: string
  initialRemaining: number
  price: number
  showRemaining?: boolean
  autoOpen?: boolean
  isAuthenticated?: boolean
  buttonLabel?: string
  buttonClassName?: string
  onBooked?: (receipt: BookingReceipt) => void
}

type BookingState = 'idle' | 'booking' | 'success' | 'full' | 'too_late' | 'error'

export default function BookSessionButton({
  sessionId,
  initialRemaining,
  price,
  showRemaining = true,
  autoOpen = false,
  isAuthenticated = true,
  buttonLabel,
  buttonClassName,
  onBooked,
}: Props) {
  const router = useRouter()
  const { t } = useT()
  const [remaining, setRemaining] = useState(initialRemaining)
  const [state, setState] = useState<BookingState>('idle')
  const [reference, setReference] = useState<string | null>(null)
  const hasAutoOpened = useRef(false)

  async function handleBook() {
    if (!isAuthenticated) {
      const returnTo = `/classes?book=${encodeURIComponent(sessionId)}`
      router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`)
      return
    }

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      const returnTo = `/classes?book=${encodeURIComponent(sessionId)}`
      router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`)
      return
    }

    setState('booking')

    const { data: bookingId, error } = await supabase.rpc('book_class_session', {
      p_session_id: sessionId,
      p_user_id: user.id,
    })

    if (error) {
      if (error.message === 'SESSION_FULL_OR_UNAVAILABLE') {
        setState('full')
      } else if (error.message === 'TOO_LATE_FOR_BANK_TRANSFER') {
        setState('too_late')
      } else {
        setState('error')
      }
      return
    }

    // payment_method is now set atomically inside book_class_session's own
    // INSERT, so there's no follow-up update call here anymore. Bookings
    // stay pending/unpaid until an admin confirms the bank transfer
    // (admin_confirm_payment) - no auto-confirm here.
    const { data: bookingRow, error: refError } = await supabase
      .from('bookings')
      .select('reference')
      .eq('id', bookingId)
      .single()

    if (refError) {
      console.error('failed to load booking reference:', refError.message)
    }

    setReference(bookingRow?.reference ?? null)
    setRemaining((r) => Math.max(0, r - 1))
    setState('success')
    // Optional presentation event: the shared card displays the same receipt in
    // a dialog. Authentication, RPC arguments, reference lookup and payment stay unchanged.
    onBooked?.({ id: String(bookingId), reference: bookingRow?.reference ?? null })
  }

  useEffect(() => {
    if (
      !autoOpen ||
      !isAuthenticated ||
      hasAutoOpened.current ||
      remaining <= 0
    ) {
      return
    }

    hasAutoOpened.current = true
    let isCurrent = true

    async function resumeBooking() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!isCurrent || !user) return

      document
        .getElementById(`session-${sessionId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      window.history.replaceState(null, '', `/classes#session-${sessionId}`)
      await handleBook()
    }

    void resumeBooking()

    return () => {
      isCurrent = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen, isAuthenticated, remaining, sessionId])

  return (
    <div className="flex flex-col items-start gap-2">
      {showRemaining && (
        <span className="rounded-full bg-[#C7D6E8]/70 px-3 py-1 text-[#25311f]">
          {remaining > 0 ? remaining : t.schedule.fullBadge}
        </span>
      )}

      {state === 'success' && reference ? (
        <PaymentConfirmationBlock amount={price} reference={reference} />
      ) : (
        <>
          <button
            type="button"
            onClick={handleBook}
            disabled={state === 'booking' || remaining <= 0}
            className={buttonClassName ?? 'rounded-full bg-[#617A55] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#4f6446] disabled:cursor-not-allowed disabled:opacity-50'}
          >
            {state === 'booking' ? t.schedule.bookButtonLoading : buttonLabel ?? t.schedule.bookButtonIdle}
          </button>
          <p className="text-xs leading-5 text-[#617A55]/70">
            {t.schedule.consentPrefix}{' '}
            <Link href="/legal/terms" className="underline">
              {t.schedule.consentTerms}
            </Link>{' '}
            {t.schedule.consentAnd}{' '}
            <Link href="/legal/cancellation" className="underline">
              {t.schedule.consentCancellation}
            </Link>
          </p>
        </>
      )}

      {state === 'full' && (
        <p className="text-sm text-red-600">{t.schedule.fullMessage}</p>
      )}
      {state === 'too_late' && (
        <p className="text-sm text-red-600">
          {t.schedule.tooLateMessagePrefix}{' '}
          <a href={WHATSAPP_URL} className="underline">
            {t.schedule.tooLateContactLink}
          </a>{' '}
          {t.schedule.tooLateMessageSuffix}
        </p>
      )}
      {state === 'error' && (
        <p className="text-sm text-red-600">{t.schedule.errorMessage}</p>
      )}
    </div>
  )
}

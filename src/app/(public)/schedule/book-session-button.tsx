'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import PaymentConfirmationBlock from '@/components/payment-confirmation-block'
import { createClient } from '@/lib/supabase/client'

type Props = {
  sessionId: string
  initialRemaining: number
  price: number
  showRemaining?: boolean
  autoOpen?: boolean
  isAuthenticated?: boolean
}

type BookingState = 'idle' | 'booking' | 'success' | 'full' | 'too_late' | 'error'

export default function BookSessionButton({
  sessionId,
  initialRemaining,
  price,
  showRemaining = true,
  autoOpen = false,
  isAuthenticated = true,
}: Props) {
  const router = useRouter()
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
          {remaining > 0 ? remaining : 'Full'}
        </span>
      )}

      {state === 'success' && reference ? (
        <PaymentConfirmationBlock amount={price} reference={reference} />
      ) : (
        <button
          type="button"
          onClick={handleBook}
          disabled={state === 'booking' || remaining <= 0}
          className="rounded-full bg-[#617A55] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#4f6446] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state === 'booking' ? 'جارٍ الحجز...' : 'احجزي هذه الحصة'}
        </button>
      )}

      {state === 'full' && (
        <p className="text-sm text-red-600">عذرًا، هذه الحصة ممتلئة</p>
      )}
      {state === 'too_late' && (
        <p className="text-sm text-red-600">
          عذرًا، لم يعد هناك وقت كافٍ لإتمام الحوالة البنكية قبل بدء هذه
          الحصة. يرجى{' '}
          <a href="/contact" className="underline">
            التواصل معنا
          </a>{' '}
          مباشرة لترتيب الحجز.
        </p>
      )}
      {state === 'error' && (
        <p className="text-sm text-red-600">
          حدث خطأ أثناء الحجز، حاولي مرة أخرى
        </p>
      )}
    </div>
  )
}

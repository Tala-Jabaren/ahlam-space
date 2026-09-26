'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import PaymentMethodSelector, {
  type PaymentMethod,
} from '@/components/payment-method-selector'
import { createClient } from '@/lib/supabase/client'

type Props = {
  sessionId: string
  initialRemaining: number
  studioAddress: string | null
  showRemaining?: boolean
  autoOpen?: boolean
  isAuthenticated?: boolean
}

type BookingState = 'idle' | 'booking' | 'success' | 'full' | 'error'

export default function BookSessionButton({
  sessionId,
  initialRemaining,
  studioAddress,
  showRemaining = true,
  autoOpen = false,
  isAuthenticated = true,
}: Props) {
  const router = useRouter()
  const [remaining, setRemaining] = useState(initialRemaining)
  const [state, setState] = useState<BookingState>('idle')
  const [isPaymentStepOpen, setIsPaymentStepOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const hasAutoOpened = useRef(false)

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
      setPaymentMethod(null)
      setIsPaymentStepOpen(true)
      window.history.replaceState(null, '', `/classes#session-${sessionId}`)
    }

    void resumeBooking()

    return () => {
      isCurrent = false
    }
  }, [autoOpen, isAuthenticated, remaining, sessionId])

  async function openPaymentStep() {
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

    setPaymentMethod(null)
    setIsPaymentStepOpen(true)
  }

  async function handleBook() {
    if (!paymentMethod || paymentMethod === 'card_gateway') {
      return
    }

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
      setState(error.message === 'SESSION_FULL_OR_UNAVAILABLE' ? 'full' : 'error')
      return
    }

    const { error: paymentMethodError } = await supabase
      .from('bookings')
      .update({ payment_method: paymentMethod })
      .eq('id', bookingId)

    if (paymentMethodError) {
      console.error(
        'booking payment_method update failed:',
        paymentMethodError.message
      )
    }

    // TEMPORARY until Phase 7 (real payment gateway): auto-confirm the
    // booking right away since there is no online payment yet, so it
    // doesn't silently expire under the 15-minute pending hold. Remove
    // this call once real payment is wired up - bookings should then
    // only confirm after actual payment.
    const { error: confirmError } = await supabase.rpc('confirm_pending_booking', {
      p_booking_id: bookingId,
    })
    if (confirmError) {
      console.error('confirm_pending_booking failed:', confirmError.message)
    }

    setRemaining((r) => Math.max(0, r - 1))
    setIsPaymentStepOpen(false)
    setState('success')
  }

  const address = studioAddress?.trim() || 'عنوان الاستوديو'

  return (
    <div className="flex flex-col items-start gap-2">
      {showRemaining && (
        <span className="rounded-full bg-[#C7D6E8]/70 px-3 py-1 text-[#25311f]">
          {remaining > 0 ? remaining : 'Full'}
        </span>
      )}

      {state === 'success' ? (
        <div className="max-w-xs rounded-lg bg-[#D6E2B6]/55 p-3 text-sm leading-6 text-[#617A55]">
          {paymentMethod === 'bank_transfer' ? (
            <p>
              تم الحجز بنجاح. طريقة الدفع: حوالة بنكية.
              <br />
              {/* TODO: Replace with real IBAN/account details. */}
              تفاصيل التحويل: اسم الحساب Ahlam Space، رقم الحساب 000000،
              IBAN: IL00 0000 0000 0000 0000 000.
            </p>
          ) : (
            <p>
              تم الحجز بنجاح. يمكنك الدفع عند الحضور في الاستوديو: {address}.
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={openPaymentStep}
          disabled={state === 'booking' || remaining <= 0}
          className="rounded-full bg-[#617A55] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#4f6446] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state === 'booking' ? 'جارٍ الحجز...' : 'احجزي هذه الحصة'}
        </button>
      )}

      {state === 'full' && (
        <p className="text-sm text-red-600">عذرًا، هذه الحصة ممتلئة</p>
      )}
      {state === 'error' && (
        <p className="text-sm text-red-600">
          حدث خطأ أثناء الحجز، حاولي مرة أخرى
        </p>
      )}

      {isPaymentStepOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#25311f]/35 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`payment-title-${sessionId}`}
          dir="rtl"
        >
          <div className="w-full max-w-md rounded-lg border border-[#617A55]/15 bg-[#F7F6F0] p-5 text-[#617A55] shadow-xl">
            <div className="mb-4">
              <h2
                id={`payment-title-${sessionId}`}
                className="font-serif text-2xl text-[#25311f]"
              >
                اختاري طريقة الدفع
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#617A55]/75">
                اختاري طريقة الدفع المناسبة لإكمال الحجز.
              </p>
            </div>

            <PaymentMethodSelector
              value={paymentMethod}
              onChange={setPaymentMethod}
              name={`booking-payment-${sessionId}`}
            />

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-start">
              <button
                type="button"
                onClick={() => {
                  setIsPaymentStepOpen(false)
                  setState('idle')
                }}
                disabled={state === 'booking'}
                className="min-h-11 rounded-lg border border-[#617A55]/20 px-5 text-sm font-semibold text-[#617A55] transition hover:bg-[#C7D6E8]/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleBook}
                disabled={!paymentMethod || state === 'booking'}
                className="min-h-11 rounded-lg bg-[#617A55] px-5 text-sm font-semibold text-[#F7F6F0] transition hover:bg-[#4f6446] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {state === 'booking' ? 'جارٍ الحجز...' : 'تأكيد الحجز'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

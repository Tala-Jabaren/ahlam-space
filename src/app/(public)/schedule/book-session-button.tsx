'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Props = {
  sessionId: string
  initialRemaining: number
}

type BookingState = 'idle' | 'booking' | 'success' | 'full' | 'error'

export default function BookSessionButton({ sessionId, initialRemaining }: Props) {
  const router = useRouter()
  const [remaining, setRemaining] = useState(initialRemaining)
  const [state, setState] = useState<BookingState>('idle')

  async function handleBook() {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
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

    // TEMPORARY until Phase 7 (real payment gateway): auto-confirm the
    // booking right away since there is no online payment yet, so it
    // doesn't silently expire under the 15-minute pending hold. Remove
    // this call once real payment is wired up — bookings should then
    // only confirm after actual payment.
    const { error: confirmError } = await supabase.rpc('confirm_pending_booking', {
      p_booking_id: bookingId,
    })
    if (confirmError) {
      console.error('confirm_pending_booking failed:', confirmError.message)
    }

    setRemaining((r) => Math.max(0, r - 1))
    setState('success')
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <span className="rounded-full bg-[#C7D6E8]/70 px-3 py-1 text-[#25311f]">
        {remaining > 0 ? remaining : 'Full'}
      </span>

      {state === 'success' ? (
        <p className="text-sm text-[#617A55]">
          تم الحجز، الحجز قيد الانتظار والدفع في الاستوديو.
        </p>
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
      {state === 'error' && (
        <p className="text-sm text-red-600">
          حدث خطأ أثناء الحجز، حاولي مرة أخرى
        </p>
      )}
    </div>
  )
}
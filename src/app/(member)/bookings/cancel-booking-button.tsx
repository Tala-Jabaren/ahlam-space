'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type CancelBookingButtonProps = {
  bookingId: string
}

export default function CancelBookingButton({
  bookingId,
}: CancelBookingButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleCancel() {
    const confirmed = window.confirm('هل أنت متأكدة من إلغاء هذا الحجز؟')

    if (!confirmed) {
      return
    }

    setLoading(true)
    setMessage(null)

    const supabase = createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMessage('يجب تسجيل الدخول لإلغاء الحجز.')
      setLoading(false)
      return
    }

    const { error } = await supabase.rpc('cancel_booking', {
      p_booking_id: bookingId,
      p_user_id: user.id,
    })

    if (error) {
      if (error.message.includes('CANCELLATION_WINDOW_PASSED')) {
        setMessage('لا يمكن إلغاء الحجز قبل أقل من 24 ساعة من موعد الحصة')
      } else {
        setMessage('تعذر إلغاء الحجز. حاولي مرة أخرى.')
      }

      setLoading(false)
      return
    }

    setMessage('تم إلغاء الحجز.')
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="w-full space-y-3 sm:w-auto">
      <button
        type="button"
        onClick={handleCancel}
        disabled={loading}
        className="min-h-11 w-full rounded-lg border border-[#617A55]/35 px-6 py-3 text-sm font-semibold text-[#617A55] transition hover:bg-[#D6E2B6]/70 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {loading ? 'جار الإلغاء...' : 'إلغاء الحجز'}
      </button>
      {message && <p className="text-sm leading-6 text-[#617A55]">{message}</p>}
    </div>
  )
}

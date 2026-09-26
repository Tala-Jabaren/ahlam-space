'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Props = {
  courseId: string
}

type PurchaseState = 'idle' | 'submitting' | 'success' | 'error'

export default function PurchaseCourseButton({ courseId }: Props) {
  const [state, setState] = useState<PurchaseState>('idle')

  async function handlePurchase() {
    setState('submitting')

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setState('error')
      return
    }

    const { error } = await supabase.from('course_purchases').insert({
      user_id: user.id,
      course_id: courseId,
      status: 'pending',
    })

    if (error) {
      setState('error')
      return
    }

    setState('success')
  }

  if (state === 'success') {
    return (
      <p className="text-sm leading-6 text-[#617A55]">
        تم إرسال طلب الشراء، سيتم تفعيل المحتوى بعد تأكيد الدفع.{' '}
        <Link href="/contact" className="font-semibold underline">
          تواصلي معنا لإتمام الدفع
        </Link>
      </p>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={handlePurchase}
        disabled={state === 'submitting'}
        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#617A55] px-6 py-3 text-sm font-semibold text-[#F7F6F0] transition hover:bg-[#617A55]/85 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state === 'submitting' ? 'جارٍ الإرسال...' : 'اشتري الآن'}
      </button>
      {state === 'error' && (
        <p className="mt-2 text-sm text-red-600">
          حدث خطأ أثناء إرسال الطلب، حاولي مرة أخرى.
        </p>
      )}
    </div>
  )
}

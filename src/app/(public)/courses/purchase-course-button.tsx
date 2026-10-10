'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PaymentConfirmationBlock from '@/components/payment-confirmation-block'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/i18n/i18n-context'

type Props = {
  courseId: string
  price: number
}

type PurchaseState = 'idle' | 'saving' | 'success' | 'error'

export default function PurchaseCourseButton({ courseId, price }: Props) {
  const router = useRouter()
  const { t, dir } = useT()
  const [state, setState] = useState<PurchaseState>('idle')
  const [reference, setReference] = useState<string | null>(null)

  async function handlePurchase() {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login?returnTo=%2Fcourses')
      return
    }

    setState('saving')

    const { data, error } = await supabase
      .from('course_purchases')
      .insert({
        course_id: courseId,
        user_id: user.id,
        status: 'pending',
        payment_method: 'bank_transfer',
      })
      .select('reference')
      .single()

    if (error) {
      console.error('course purchase failed:', error.message)
      setState('error')
      return
    }

    setReference(data.reference)
    setState('success')
  }

  if (state === 'success' && reference) {
    return <PaymentConfirmationBlock amount={price} reference={reference} />
  }

  return (
    <div className="flex flex-col items-start gap-2" dir={dir}>
      <button
        type="button"
        onClick={handlePurchase}
        disabled={state === 'saving'}
        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#617A55] px-7 py-3 text-sm font-semibold text-[#F7F6F0] transition hover:bg-[#4f6446] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state === 'saving' ? t.courses.purchaseButton.buying : t.courses.purchaseButton.buyNow}
      </button>

      {state === 'error' && (
        <p className="text-sm text-red-600">{t.courses.purchaseButton.purchaseError}</p>
      )}
    </div>
  )
}

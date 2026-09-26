'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PaymentMethodSelector, {
  type PaymentMethod,
} from '@/components/payment-method-selector'
import { createClient } from '@/lib/supabase/client'

type Props = {
  courseId: string
}

type PurchaseState = 'idle' | 'saving' | 'success' | 'error'

export default function PurchaseCourseButton({ courseId }: Props) {
  const router = useRouter()
  const [state, setState] = useState<PurchaseState>('idle')
  const [isPaymentStepOpen, setIsPaymentStepOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)

  async function openPaymentStep() {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login?returnTo=%2Fcourses')
      return
    }

    setPaymentMethod(null)
    setIsPaymentStepOpen(true)
  }

  async function handlePurchase() {
    if (!paymentMethod || paymentMethod === 'card_gateway') {
      return
    }

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login?returnTo=%2Fcourses')
      return
    }

    setState('saving')

    const { error } = await supabase.from('course_purchases').insert({
      course_id: courseId,
      user_id: user.id,
      status: 'pending',
      payment_method: paymentMethod,
    })

    if (error) {
      console.error('course purchase failed:', error.message)
      setState('error')
      return
    }

    setIsPaymentStepOpen(false)
    setState('success')
  }

  return (
    <div className="flex flex-col items-start gap-2" dir="rtl">
      {state === 'success' ? (
        <div className="rounded-lg bg-[#D6E2B6]/55 p-3 text-sm leading-6 text-[#617A55]">
          {paymentMethod === 'bank_transfer' ? (
            <p>
              تم تسجيل طلب الشراء. طريقة الدفع: حوالة بنكية.
              <br />
              {/* TODO: Replace with real IBAN/account details. */}
              تفاصيل التحويل: اسم الحساب Ahlam Space، رقم الحساب 000000، IBAN:
              IL00 0000 0000 0000 0000 000.
            </p>
          ) : (
            <p>
              تم تسجيل طلب الشراء. يمكنك الدفع عند الحضور في الاستوديو، وسيتم
              تأكيد الوصول للكورس يدويًا بعد الدفع.
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={openPaymentStep}
          disabled={state === 'saving'}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#617A55] px-7 py-3 text-sm font-semibold text-[#F7F6F0] transition hover:bg-[#4f6446] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state === 'saving' ? 'جارٍ التسجيل...' : 'اشتري الآن'}
        </button>
      )}

      {state === 'error' && (
        <p className="text-sm text-red-600">
          حدث خطأ أثناء تسجيل الطلب، حاولي مرة أخرى
        </p>
      )}

      {isPaymentStepOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#25311f]/35 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`course-payment-title-${courseId}`}
          dir="rtl"
        >
          <div className="w-full max-w-md rounded-lg border border-[#617A55]/15 bg-[#F7F6F0] p-5 text-[#617A55] shadow-xl">
            <div className="mb-4">
              <h2
                id={`course-payment-title-${courseId}`}
                className="font-serif text-2xl text-[#25311f]"
              >
                اختاري طريقة الدفع
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#617A55]/75">
                اختاري طريقة الدفع المناسبة لإكمال طلب شراء الكورس.
              </p>
            </div>

            <PaymentMethodSelector
              value={paymentMethod}
              onChange={setPaymentMethod}
              name={`course-payment-${courseId}`}
            />

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-start">
              <button
                type="button"
                onClick={() => {
                  setIsPaymentStepOpen(false)
                  setState('idle')
                }}
                disabled={state === 'saving'}
                className="min-h-11 rounded-lg border border-[#617A55]/20 px-5 text-sm font-semibold text-[#617A55] transition hover:bg-[#C7D6E8]/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handlePurchase}
                disabled={!paymentMethod || state === 'saving'}
                className="min-h-11 rounded-lg bg-[#617A55] px-5 text-sm font-semibold text-[#F7F6F0] transition hover:bg-[#4f6446] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {state === 'saving' ? 'جارٍ التسجيل...' : 'تأكيد الشراء'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

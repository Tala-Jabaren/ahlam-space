'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type PaymentMethod = 'bank_transfer' | 'studio'

const KNOWN_ERROR_MESSAGES: Record<string, string> = {
  FORBIDDEN: 'ليست لديك صلاحية لتنفيذ هذا الإجراء.',
  NOT_FOUND_OR_ALREADY_PROCESSED: 'لم يتم العثور على الطلب أو تمت معالجته مسبقاً.',
  INVALID_PAYMENT_METHOD: 'طريقة الدفع غير صالحة.',
}

function errorMessageFor(rawMessage: string): string {
  return KNOWN_ERROR_MESSAGES[rawMessage] ?? 'تعذر تأكيد الدفع. تأكدي من الصلاحيات وحاولي مرة أخرى.'
}

// Not a reuse of AdminRpcButton: confirming a package purchase needs an
// admin-chosen payment method first, which that button's fixed `args`
// shape has no room for.
export default function ConfirmPackagePayment({
  purchaseId,
  label,
  disabled = false,
}: {
  purchaseId: string
  label: string
  disabled?: boolean
}) {
  const router = useRouter()
  const [method, setMethod] = useState<PaymentMethod>('bank_transfer')
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const [isPending, setIsPending] = useState(false)

  async function handleConfirm() {
    if (!window.confirm(`تأكيد دفع "${label}" عبر ${method === 'bank_transfer' ? 'تحويل بنكي' : 'الاستوديو'}؟`)) return

    setIsPending(true)
    setMessage(null)
    setIsError(false)

    const supabase = createClient()
    const { error } = await supabase.rpc('admin_confirm_package_purchase', {
      p_purchase_id: purchaseId,
      p_payment_method: method,
    })

    if (error) {
      console.error('admin_confirm_package_purchase failed:', error.message)
      setIsError(true)
      setMessage(errorMessageFor(error.message))
      setIsPending(false)
      return
    }

    setMessage('تم تأكيد الدفع.')
    setIsPending(false)
    router.refresh()
  }

  if (disabled) return null

  return (
    <div className="min-w-0 sm:w-56">
      <label className="block text-xs font-semibold text-[#617A55]/70">
        طريقة الدفع
        <select
          value={method}
          onChange={event => setMethod(event.target.value as PaymentMethod)}
          disabled={isPending}
          className="mt-1 w-full rounded-lg border border-[#617A55]/25 bg-[#F7F6F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#617A55]"
        >
          <option value="bank_transfer">تحويل بنكي</option>
          <option value="studio">الدفع في الاستوديو</option>
        </select>
      </label>
      <button
        type="button"
        onClick={handleConfirm}
        disabled={isPending}
        className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#617A55] px-5 py-2.5 text-sm font-semibold text-[#F7F6F0] transition hover:bg-[#526849] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'جارٍ التنفيذ...' : 'تأكيد الدفع'}
      </button>
      {message && (
        <p role="status" className={`mt-2 text-sm leading-6 ${isError ? 'text-[#25311f]' : 'text-[#617A55]'}`}>
          {message}
        </p>
      )}
    </div>
  )
}

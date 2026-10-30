'use client'

import { useState } from 'react'
import { useT } from '@/i18n/i18n-context'
import { checkoutAr } from '@/i18n/checkout-ar'
import { bankDetails, bankDetailsArePlaceholders } from '@/lib/bank-details'

type Props = {
  amount: number
  reference: string
  title?: string
}

// Shown right after placing an order / buying a course / booking a paid
// session, and again in My Orders / My Bookings for anything still unpaid.
export default function PaymentConfirmationBlock({
  amount,
  reference,
  title,
}: Props) {
  const { t, locale, dir } = useT()
  const c = t.checkout ?? checkoutAr
  const [copied, setCopied] = useState(false)
  const amountLabel = new Intl.NumberFormat(locale === 'ar' ? 'ar' : 'en-US', {
    style: 'currency',
    currency: 'ILS',
  }).format(amount)

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(reference)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can fail (permissions, insecure context) - the
      // reference text is still visible and selectable, so this is a
      // silent no-op rather than an error state.
    }
  }

  return (
    <div
      dir={dir}
      className="rounded-lg border border-[#617A55]/15 bg-[#D6E2B6]/35 p-5 text-sm leading-7 text-[#25311f]"
    >
      <p className="font-serif text-lg">{title ?? c.bank.title}</p>
      <p className="mt-2">
        {c.bank.amount}:{' '}
        <strong>
          <bdi>{amountLabel}</bdi>
        </strong>
      </p>
      <p className="flex flex-wrap items-center gap-2">
        {c.bank.reference}:{' '}
        <strong className="font-mono" dir="ltr">
          {reference}
        </strong>
        <button
          type="button"
          onClick={copyReference}
          className="inline-flex min-h-8 items-center rounded-full border border-[#617A55]/30 px-3 py-1 text-xs font-medium text-[#617A55] transition hover:bg-[#617A55]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55]"
        >
          {copied ? c.bank.referenceCopied : c.bank.copyReference}
        </button>
      </p>

      {bankDetailsArePlaceholders && (
        <p role="alert" className="mt-3 rounded-lg border-2 border-red-600 bg-red-50 p-3 font-semibold text-red-700">
          تنبيه للإدارة: بيانات الحساب البنكي ما زالت نموذجية (placeholder) في src/lib/bank-details.ts. يجب استبدالها بالبيانات الحقيقية قبل الإطلاق.
        </p>
      )}

      <div className="mt-3 border-t border-[#617A55]/15 pt-3">
        <p className="font-semibold">{c.bank.details}</p>
        <p>
          {c.bank.holder}: {bankDetails.accountHolder}
        </p>
        <p>
          {c.bank.bank}:{' '}
          {bankDetails.bankName === 'اسم البنك'
            ? c.bank.bankPlaceholder
            : bankDetails.bankName}
        </p>
        <p>
          {c.bank.account}:{' '}
          {bankDetails.accountNumber === 'رقم الحساب / IBAN'
            ? c.bank.accountPlaceholder
            : bankDetails.accountNumber}
        </p>
      </div>
    </div>
  )
}

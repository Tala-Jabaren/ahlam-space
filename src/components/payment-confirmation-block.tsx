'use client'

import { useT } from '@/i18n/i18n-context'
import { checkoutAr } from '@/i18n/checkout-ar'
import { bankDetails } from '@/lib/bank-details'

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
  const amountLabel = new Intl.NumberFormat(locale === 'ar' ? 'ar' : 'en-US', {
    style: 'currency',
    currency: 'ILS',
  }).format(amount)
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
      <p>
        {c.bank.reference}:{' '}
        <strong className="font-mono" dir="ltr">
          {reference}
        </strong>
      </p>

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

'use client'

import { useState } from 'react'
import { useT } from '@/i18n/i18n-context'
import { checkoutAr } from '@/i18n/checkout-ar'
import { BANK, bankDetailsArePlaceholders, PHONE_DISPLAY } from '@/content/site-contact'

type Props = {
  amount: number
  reference: string | null
  title?: string
  showAdminWarning?: boolean
  showInstructions?: boolean
}

export default function PaymentConfirmationBlock({
  amount,
  reference,
  title,
  showAdminWarning = true,
  showInstructions = true,
}: Props) {
  const { t, locale, dir } = useT()
  const c = t.checkout ?? checkoutAr
  const [copied, setCopied] = useState(false)
  const [accountCopied, setAccountCopied] = useState(false)
  const canTransfer = showInstructions && Boolean(reference)
  const amountLabel = new Intl.NumberFormat(locale === 'ar' ? 'ar' : 'en-US', {
    style: 'currency',
    currency: 'ILS',
  }).format(amount)
  // Grouped in 4s for readability only - the raw, unspaced value is what
  // gets copied and what's stored in BANK.iban.
  const groupedAccountNumber = BANK.iban.replace(/(.{4})/g, '$1 ').trim()
  // BANK.note is one Arabic sentence with the phone number embedded in it -
  // split on it so the number can be isolated in its own <bdi dir="ltr">
  // below, instead of sitting unisolated inside RTL text where the browser
  // can visually reverse its digits/symbols.
  const [notePrefix, noteSuffix] = BANK.note.split(PHONE_DISPLAY)

  async function copyReference() {
    if (!reference) return
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

  async function copyAccountNumber() {
    try {
      await navigator.clipboard.writeText(BANK.iban)
      setAccountCopied(true)
      setTimeout(() => setAccountCopied(false), 2000)
    } catch {
      // Same silent no-op as copyReference above - the IBAN is still
      // visible and selectable for a manual copy.
    }
  }

  return (
    <div
      dir={dir}
      className="rounded-lg border border-[#617A55]/15 bg-[#D6E2B6]/35 p-5 text-sm leading-7 text-[#25311f]"
    >
      {canTransfer && (
        <>
          <p className="font-serif text-lg">{title ?? c.bank.title}</p>
          <p className="mt-2">
            {c.bank.amount}:{' '}
            <strong><bdi>{amountLabel}</bdi></strong>
          </p>
          <p className="flex flex-wrap items-center gap-2">
            {c.bank.reference}:{' '}
            <strong className="font-mono" dir="ltr">{reference}</strong>
            <button
              type="button"
              onClick={copyReference}
              className="inline-flex min-h-8 items-center rounded-full border border-[#617A55]/30 px-3 py-1 text-xs font-medium text-[#617A55] transition hover:bg-[#617A55]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55]"
            >
              {copied ? c.bank.referenceCopied : c.bank.copyReference}
            </button>
          </p>
        </>
      )}

      {showAdminWarning && bankDetailsArePlaceholders && (
        <p role="alert" className="mt-3 rounded-lg border-2 border-red-600 bg-red-50 p-3 font-semibold text-red-700">
          تنبيه للإدارة: بيانات الحساب البنكي ما زالت نموذجية (placeholder) في src/lib/bank-details.ts. يجب استبدالها بالبيانات الحقيقية قبل الإطلاق.
        </p>
      )}

      <div className={canTransfer ? 'mt-3 border-t border-[#617A55]/15 pt-3' : undefined}>
        <p className="font-semibold">{c.bank.details}</p>
        <p>
          {c.bank.holder}: {BANK.accountHolder}
        </p>
        <p>
          {c.bank.bank}:{' '}
          {BANK.bankName === 'اسم البنك'
            ? c.bank.bankPlaceholder
            : BANK.bankName}
        </p>
        <p className="flex flex-wrap items-center gap-2">
          {c.bank.account}:{' '}
          {BANK.iban === 'رقم الحساب / IBAN' ? (
            c.bank.accountPlaceholder
          ) : (
            <>
              <strong className="select-all font-mono" dir="ltr">
                {groupedAccountNumber}
              </strong>
              {canTransfer && (
                <button
                  type="button"
                  onClick={copyAccountNumber}
                  className="inline-flex min-h-8 items-center rounded-full border border-[#617A55]/30 px-3 py-1 text-xs font-medium text-[#617A55] transition hover:bg-[#617A55]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55]"
                >
                  {accountCopied ? c.bank.accountCopied : c.bank.copyAccount}
                </button>
              )}
            </>
          )}
        </p>
        {canTransfer && (
          <>
            <p className="mt-2 font-semibold">{c.bank.transferNote}</p>
            <p className="mt-1 text-[#4f5d49]">
              {notePrefix}
              <bdi dir="ltr">{PHONE_DISPLAY}</bdi>
              {noteSuffix}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

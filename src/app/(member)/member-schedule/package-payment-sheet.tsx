'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { BANK, bankDetailsArePlaceholders } from '@/content/site-contact'
import { WHATSAPP_URL } from '@/content/site-contact'
import { useT } from '@/i18n/i18n-context'

type Props = {
  packageName: string
  sessionsCount: number
  price: number
  reference: string
  onClose: () => void
}

// Arabic requires grammatical number agreement ("الحصص الست" - "the six
// sessions" - not "الحصص 6") for the small set of session counts the
// seeded packages actually use; anything outside that falls back to a
// plain digit rather than guessing a word form.
const AR_COUNT_WORDS: Record<number, string> = {
  2: 'الحصتان', 3: 'الثلاث', 4: 'الأربع', 5: 'الخمس', 6: 'الست',
  7: 'السبع', 8: 'الثماني', 9: 'التسع', 10: 'العشر',
}

function formatAmount(value: number, locale: string) {
  return `${new Intl.NumberFormat(locale).format(value)} ₪`
}

// Screen 2 of the approved design: a bottom sheet on mobile, centered
// dialog on larger screens - same shell PackageBookingButton's confirm
// sheet and class-card.tsx's success dialog use, so the three read as one
// flow rather than three different components.
export default function PackagePaymentSheet({ packageName, sessionsCount, price, reference, onClose }: Props) {
  const router = useRouter()
  const { t, dir, locale } = useT()
  const copy = t.classes.packages
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function handleReturn() {
    onClose()
    router.refresh()
  }

  async function copyAccount() {
    try {
      await navigator.clipboard.writeText(BANK.iban)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can fail silently (permissions/insecure context) - the
      // IBAN stays visible and selectable for a manual copy.
    }
  }

  const countWord = AR_COUNT_WORDS[sessionsCount] ?? String(sessionsCount)
  const whatsappText = encodeURIComponent(`${copy.sendProofWhatsapp} - ${reference}`)

  return (
    <div
      dir={dir}
      role="dialog"
      aria-modal="true"
      aria-label={copy.completePayment}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={event => event.stopPropagation()}
        className="motion-reduce:transition-none flex max-h-[90vh] w-full flex-col overflow-y-auto rounded-t-[24px] bg-[#FAF7F2] p-4 shadow-xl sm:max-w-md sm:rounded-[24px] sm:p-6"
      >
        <div aria-hidden="true" className="mx-auto mb-3 h-[5px] w-11 rounded-full bg-[#E8E2D8] sm:hidden" />

        <button type="button" onClick={onClose} className="flex min-h-11 items-center gap-1 self-start text-[15px] font-medium text-[#617A55]">
          <ChevronRight aria-hidden="true" className="size-4" />
          {copy.backToPackages}
        </button>
        <h2 className="mt-2 text-[24px] font-bold text-[#2B2A27]">{copy.completePayment}</h2>

        <div className="mt-4 rounded-2xl border border-[#E8E2D8] bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[19px] font-bold text-[#2B2A27]">{packageName}</p>
            <span className="rounded-full bg-[#F6E7C9] px-3 py-1 text-xs font-semibold text-[#6B4A0B]">{t.classCards.pending}</span>
          </div>
          <dl className="mt-3 grid gap-2 text-[15px]">
            <div className="flex items-center justify-between">
              <dt className="text-[#5C574F]">{copy.amountRowLabel}</dt>
              <dd className="font-semibold text-[#2B2A27]"><bdi>{formatAmount(price, locale)}</bdi></dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[#5C574F]">{copy.orderNumberRowLabel}</dt>
              <dd className="font-mono font-semibold tracking-[1px] text-[#2B2A27]" dir="ltr">{reference}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-3 rounded-2xl bg-[#E4ECE6] p-4 text-[15px] leading-7 text-[#25402F]">
          {copy.infoBoxText.replace('{countWord}', countWord)}
        </div>

        <div className="mt-3 rounded-2xl border border-[#E8E2D8] bg-white p-4">
          <p className="text-[16px] font-bold text-[#2B2A27]">{copy.bankDetailsTitle}</p>
          {bankDetailsArePlaceholders && (
            <p role="alert" className="mt-3 rounded-lg border-2 border-red-600 bg-red-50 p-3 text-sm font-semibold text-red-700">
              تنبيه للإدارة: بيانات الحساب البنكي ما زالت نموذجية (placeholder) في src/lib/bank-details.ts. يجب استبدالها بالبيانات الحقيقية قبل الإطلاق.
            </p>
          )}
          <dl className="mt-3 grid gap-2 text-[15px]">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[#5C574F]">{copy.bankRowBank}</dt>
              <dd className="font-semibold text-[#2B2A27]">{BANK.bankName}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[#5C574F]">{copy.bankRowHolder}</dt>
              <dd className="font-semibold text-[#2B2A27]">{BANK.accountHolder}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[#5C574F]">{copy.bankRowAccount}</dt>
              <dd className="font-mono font-semibold" dir="ltr">{BANK.iban}</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={copyAccount}
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg border border-[#617A55]/35 px-4 text-sm font-semibold text-[#617A55] transition hover:bg-[#617A55]/10"
          >
            {copied ? copy.accountNumberCopied : copy.copyAccountNumber}
          </button>
        </div>

        <div className="mt-3 rounded-2xl border border-[#E8E2D8] bg-white p-4 text-[15px] leading-7 text-[#2B2A27]">
          <p className="font-bold">{copy.payAtStudioTitle}</p>
          <p className="mt-1">{copy.payAtStudioBodyInline.replace('{reference}', reference)}</p>
        </div>

        <a
          href={`${WHATSAPP_URL}?text=${whatsappText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 text-[15px] font-semibold text-[#617A55] underline underline-offset-4"
        >
          {copy.sendProofWhatsapp}
        </a>

        <button
          type="button"
          onClick={handleReturn}
          className="sticky bottom-0 mt-5 inline-flex min-h-[50px] w-full items-center justify-center rounded-xl bg-[#617A55] px-6 text-[17px] font-bold text-white transition hover:bg-[#4F6446]"
        >
          {copy.returnToClasses}
        </button>
      </div>
    </div>
  )
}

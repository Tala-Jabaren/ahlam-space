'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import PaymentConfirmationBlock from '@/components/payment-confirmation-block'
import { WHATSAPP_URL } from '@/content/site-contact'
import { useT } from '@/i18n/i18n-context'

type Props = {
  packageName: string
  sessionsCount: number
  price: number
  reference: string
  onClose: () => void
}

// Fixed overlay for both layouts - a bottom sheet on narrow screens (full
// width, slides from the bottom edge) and a centered dialog on sm+ screens,
// purely via Tailwind breakpoints rather than separate components.
export default function PackagePaymentSheet({ packageName, sessionsCount, price, reference, onClose }: Props) {
  const router = useRouter()
  const { t, dir } = useT()
  const copy = t.classes.packages

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function handleContinue() {
    onClose()
    router.refresh()
  }

  const whatsappText = encodeURIComponent(`${copy.sendProofWhatsapp} - ${reference}`)

  return (
    <div
      dir={dir}
      role="dialog"
      aria-modal="true"
      aria-label={copy.completePayment}
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#25311f]/40 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={event => event.stopPropagation()}
        className="motion-reduce:transition-none flex max-h-[90vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-[#F7F6F0] p-6 shadow-xl sm:max-w-lg sm:rounded-2xl"
      >
        <div aria-hidden="true" className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#617A55]/25 sm:hidden" />

        <div className="flex items-start justify-between gap-3">
          <h2 className="font-serif text-2xl text-[#25311f]">{copy.completePayment}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.classCards.close}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-xl text-[#617A55] transition hover:bg-[#617A55]/10"
          >
            ×
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-[#617A55]/15 bg-white p-4 text-sm leading-7">
          <p className="font-semibold text-[#25311f]">{copy.orderSummary}</p>
          <p className="mt-1 flex items-center justify-between text-[#4f5d49]">
            <span>{packageName}</span>
            <span>{copy.sessionsLabel}: {sessionsCount}</span>
          </p>
        </div>

        <div className="mt-4">
          <PaymentConfirmationBlock amount={price} reference={reference} />
        </div>

        <div className="mt-3 rounded-lg border border-[#617A55]/15 bg-white p-4 text-sm leading-7 text-[#25311f]">
          <p className="font-semibold">{copy.payAtStudioTitle}</p>
          <p className="mt-1">
            {copy.payAtStudioBody}{' '}
            <strong className="font-mono" dir="ltr">{reference}</strong>
          </p>
        </div>

        <a
          href={`${WHATSAPP_URL}?text=${whatsappText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#617A55]/30 px-5 text-sm font-semibold text-[#617A55] transition hover:bg-[#617A55]/10"
        >
          {copy.sendProofWhatsapp}
        </a>

        <p className="mt-4 text-sm leading-7 text-[#617A55]/80">{copy.addedAfterConfirm}</p>

        <button
          type="button"
          onClick={handleContinue}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#617A55] px-6 text-sm font-semibold text-white transition hover:bg-[#617A55]/85"
        >
          {copy.continueToMyPackages}
        </button>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/i18n/i18n-context'
import type { BookingReceipt } from './types'

type PackageCredit = { purchaseId: string; remaining: number; total: number }

type Props = {
  sessionId: string
  sessionName: string
  dateLabel: string
  timeLabel: string
  price: number
  packageCredit: PackageCredit
  isAuthenticated: boolean
  onBooked: (receipt: BookingReceipt) => void
}

type Method = 'package' | 'cash'
type State = 'idle' | 'booking' | 'error'

const ERROR_KEYS: Record<string, 'forbiddenError' | 'sessionFullError' | 'alreadyBookedError' | 'notEligibleError' | 'noCreditError' | 'tooLateError' | 'sessionStartedError'> = {
  FORBIDDEN: 'forbiddenError',
  SESSION_FULL: 'sessionFullError',
  SESSION_FULL_OR_UNAVAILABLE: 'sessionFullError',
  ALREADY_BOOKED: 'alreadyBookedError',
  NOT_PACKAGE_ELIGIBLE: 'notEligibleError',
  NO_PACKAGE_CREDIT: 'noCreditError',
  TOO_LATE_FOR_BANK_TRANSFER: 'tooLateError',
  SESSION_STARTED: 'sessionStartedError',
}

function formatAmount(value: number, locale: string) {
  return `${new Intl.NumberFormat(locale).format(value)} ₪`
}

// Shown instead of the plain BookSessionButton when a session is both
// package-eligible and she has an active package - offers the choice
// inline rather than silently always spending the credit, matching the
// confirmation-sheet design (two radio options, not two separate flows).
// Same fixed-overlay shell as PackagePaymentSheet (bottom sheet on
// mobile, centered dialog on sm+) rather than a native <dialog>, which
// fights that responsive behavior via its own auto-centering.
export default function PackageBookingButton({ sessionId, sessionName, dateLabel, timeLabel, price, packageCredit, isAuthenticated, onBooked }: Props) {
  const router = useRouter()
  const { t, dir, locale } = useT()
  const copy = t.classCards
  const [open, setOpen] = useState(false)
  const [method, setMethod] = useState<Method>('package')
  const [state, setState] = useState<State>('idle')
  const [errorKey, setErrorKey] = useState<string | null>(null)

  function openSheet(initial: Method) {
    setMethod(initial)
    setState('idle')
    setErrorKey(null)
    setOpen(true)
  }

  async function confirm() {
    if (!isAuthenticated) {
      const returnTo = `/classes?book=${encodeURIComponent(sessionId)}`
      router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`)
      return
    }

    setState('booking')
    setErrorKey(null)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setState('error')
      setErrorKey('FORBIDDEN')
      return
    }

    if (method === 'package') {
      const { data: bookingId, error } = await supabase.rpc('book_class_session_with_package', {
        p_session_id: sessionId,
        p_user_id: user.id,
      })
      if (error || !bookingId) {
        setState('error')
        setErrorKey(error?.message ?? 'ERROR')
        return
      }
      setOpen(false)
      onBooked({
        id: String(bookingId),
        reference: null,
        packageBalance: { remaining: packageCredit.remaining - 1, total: packageCredit.total },
      })
      return
    }

    // Cash: same two calls book-session-button.tsx makes (existing
    // book_class_session RPC, then its reference) - not a second system,
    // just reached from this dialog instead of that component's own button.
    const { data: bookingId, error } = await supabase.rpc('book_class_session', {
      p_session_id: sessionId,
      p_user_id: user.id,
    })
    if (error || !bookingId) {
      setState('error')
      setErrorKey(error?.message ?? 'ERROR')
      return
    }
    const { data: bookingRow, error: refError } = await supabase
      .from('bookings')
      .select('reference')
      .eq('id', bookingId)
      .single()
    if (refError) console.error('failed to load booking reference:', refError.message)
    setOpen(false)
    onBooked({ id: String(bookingId), reference: bookingRow?.reference ?? null })
  }

  const amountLabel = formatAmount(price, locale)
  const errorMessage = errorKey ? copy[ERROR_KEYS[errorKey] ?? 'bookingGenericError'] ?? copy.bookingGenericError : null

  return (
    <div className="flex w-full items-center gap-3">
      <button
        type="button"
        onClick={() => openSheet('package')}
        className="flex min-h-[46px] flex-1 items-center justify-center rounded-xl bg-[#3F6350] px-4 text-[15px] font-bold text-white transition hover:bg-[#345142]"
      >
        {copy.bookWithPackageCta}
      </button>
      <button
        type="button"
        onClick={() => openSheet('cash')}
        className="shrink-0 text-[13px] font-medium text-[#5C574F] underline underline-offset-4"
      >
        {copy.payCashCta.replace('{amount}', amountLabel)}
      </button>

      {open && (
        <div
          dir={dir}
          role="dialog"
          aria-modal="true"
          aria-label={copy.bookDialogTitle}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
          onClick={() => state !== 'booking' && setOpen(false)}
        >
          <div
            onClick={event => event.stopPropagation()}
            className="motion-reduce:transition-none flex max-h-[90vh] w-full flex-col overflow-y-auto rounded-t-[24px] bg-[#FAF7F2] p-4 shadow-xl sm:max-w-md sm:rounded-[24px] sm:p-6"
          >
            <div aria-hidden="true" className="mx-auto mb-3 h-[5px] w-11 rounded-full bg-[#E8E2D8] sm:hidden" />
            <h3 className="text-[22px] font-bold text-[#2B2A27]">{copy.bookDialogTitle}</h3>

            <div className="mt-4 rounded-2xl border border-[#E8E2D8] bg-white p-4">
              <p className="text-[18px] font-bold text-[#2B2A27]">{sessionName}</p>
              <p className="mt-1 text-[14px] text-[#5C574F]">{copy.sessionWithInstructor.replace('{date}', dateLabel).replace('{time}', timeLabel)}</p>
            </div>

            <fieldset className="mt-4 grid gap-3 border-0 p-0">
              <legend className="mb-1 text-[15px] font-semibold text-[#2B2A27]">{copy.paymentMethodLabel}</legend>
              <label className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl p-3 ${method === 'package' ? 'border-2 border-[#3F6350] bg-[#F2F7F3]' : 'border border-[#D9D2C5]'}`}>
                <input type="radio" name="method" checked={method === 'package'} onChange={() => setMethod('package')} className="mt-1 size-[22px] accent-[#3F6350]" />
                <span>
                  <span className="block font-semibold text-[#2B2A27]">{copy.payWithPackageLabel}</span>
                  <span className="block text-[14px] text-[#5C574F]">
                    {copy.payWithPackageDescription.replace('{from}', String(packageCredit.remaining)).replace('{to}', String(packageCredit.remaining - 1))}
                  </span>
                </span>
              </label>
              <label className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl p-3 ${method === 'cash' ? 'border-2 border-[#3F6350] bg-[#F2F7F3]' : 'border border-[#D9D2C5]'}`}>
                <input type="radio" name="method" checked={method === 'cash'} onChange={() => setMethod('cash')} className="mt-1 size-[22px] accent-[#3F6350]" />
                <span>
                  <span className="block font-semibold text-[#2B2A27]">{copy.payCashLabel.replace('{amount}', amountLabel)}</span>
                  <span className="block text-[14px] text-[#5C574F]">{copy.payCashDescription}</span>
                </span>
              </label>
            </fieldset>

            <p className="mt-3 text-[13px] leading-6 text-[#5C574F]">{copy.cancelCreditNote}</p>
            {errorMessage && <p role="alert" className="mt-3 text-sm leading-6 text-red-700">{errorMessage}</p>}

            <button
              type="button"
              disabled={state === 'booking'}
              onClick={confirm}
              className="mt-5 inline-flex min-h-[54px] w-full items-center justify-center rounded-2xl bg-[#3F6350] px-6 text-[18px] font-bold text-white transition hover:bg-[#345142] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {state === 'booking' ? copy.bookingLoading : copy.confirmBooking}
            </button>
            <button
              type="button"
              disabled={state === 'booking'}
              onClick={() => setOpen(false)}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center text-[15px] font-medium text-[#5C574F] disabled:opacity-60"
            >
              {copy.back}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/i18n/i18n-context'
import type { BookingReceipt } from './types'
import styles from './class-card.module.css'

type PackageCredit = { purchaseId: string; remaining: number; total: number }

type Props = {
  sessionId: string
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

// Shown instead of the plain BookSessionButton when a session is both
// package-eligible and she has an active package - offers the choice
// inline rather than silently always spending the credit, matching the
// confirmation-sheet design (two radio options, not two separate flows).
export default function PackageBookingButton({ sessionId, dateLabel, timeLabel, price, packageCredit, isAuthenticated, onBooked }: Props) {
  const router = useRouter()
  const { t, dir } = useT()
  const copy = t.classCards
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [method, setMethod] = useState<Method>('package')
  const [state, setState] = useState<State>('idle')
  const [errorKey, setErrorKey] = useState<string | null>(null)

  function openDialog(initial: Method) {
    setMethod(initial)
    setState('idle')
    setErrorKey(null)
    dialog.current?.showModal()
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
      dialog.current?.close()
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
    dialog.current?.close()
    onBooked({ id: String(bookingId), reference: bookingRow?.reference ?? null })
  }

  const amountLabel = new Intl.NumberFormat('ar', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(price)
  const errorMessage = errorKey ? copy[ERROR_KEYS[errorKey] ?? 'bookingGenericError'] ?? copy.bookingGenericError : null

  return (
    <div className={styles.bookingAction}>
      <button type="button" className={styles.button} onClick={() => openDialog('package')}>
        {copy.bookWithPackageCta}
      </button>
      <button
        type="button"
        onClick={() => openDialog('cash')}
        className="mt-1 text-xs font-medium text-[#4f5d49] underline"
      >
        {copy.payCashCta.replace('{amount}', amountLabel)}
      </button>

      <dialog ref={dialog} dir={dir} className={styles.dialog} aria-labelledby={titleId}>
        <h3 id={titleId}>{copy.bookDialogTitle}</h3>
        <p className="text-sm text-[#4f5d49]">{copy.sessionWithInstructor.replace('{date}', dateLabel).replace('{time}', timeLabel)}</p>

        <fieldset className="mt-4 grid gap-3 border-0 p-0">
          <legend className="mb-1 text-sm font-semibold">{copy.paymentMethodLabel}</legend>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-[#617A55]/20 p-3">
            <input type="radio" name="method" checked={method === 'package'} onChange={() => setMethod('package')} className="mt-1" />
            <span>
              <span className="block font-semibold">{copy.payWithPackageLabel}</span>
              <span className="block text-sm text-[#4f5d49]">
                {copy.payWithPackageDescription.replace('{from}', String(packageCredit.remaining)).replace('{to}', String(packageCredit.remaining - 1))}
              </span>
            </span>
          </label>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-[#617A55]/20 p-3">
            <input type="radio" name="method" checked={method === 'cash'} onChange={() => setMethod('cash')} className="mt-1" />
            <span>
              <span className="block font-semibold">{copy.payCashLabel.replace('{amount}', amountLabel)}</span>
              <span className="block text-sm text-[#4f5d49]">{copy.payCashDescription}</span>
            </span>
          </label>
        </fieldset>

        {method === 'package' && <p className="mt-3 text-xs leading-6 text-[#4f5d49]">{copy.cancelCreditNote}</p>}
        {errorMessage && <p role="alert" className={styles.feedback}>{errorMessage}</p>}

        <div className={styles.dialogActions}>
          <button type="button" className={`${styles.button} ${styles.secondary}`} disabled={state === 'booking'} onClick={() => dialog.current?.close()}>
            {copy.back}
          </button>
          <button type="button" className={styles.button} disabled={state === 'booking'} onClick={confirm}>
            {state === 'booking' ? copy.bookingLoading : copy.confirmBooking}
          </button>
        </div>
      </dialog>
    </div>
  )
}

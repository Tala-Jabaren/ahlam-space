'use client'

import { useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { WHATSAPP_URL, PHONE_DISPLAY, PHONE_E164 } from '@/content/site-contact'
import { useT } from '@/i18n/i18n-context'

type Props = {
  bookingId: string
  canCancel: boolean
  isPackageBooking: boolean
  paymentStatus: string
  packagePurchaseId?: string | null
}

type State = 'idle' | 'cancelling' | 'windowPassed' | 'error' | { done: string }

const contactLinkStyle = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#617A55]/30 px-4 text-sm font-semibold text-[#617A55] transition hover:bg-[#617A55]/10'
const buttonStyle = 'inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[#617A55]/35 px-6 text-sm font-semibold text-[#617A55] transition hover:bg-[#D6E2B6]/70 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto'

// One shared control for every place a member's booking is shown
// (/classes, /member-schedule via class-card.tsx, and /bookings) - the
// 12-hour rule, the package/regular wording split, and the "too late"
// contact fallback all live here once instead of being reimplemented per
// page. Not gated behind PACKAGES_ENABLED: regular-booking cancellation is
// a live feature regardless of that flag, it's only the package-specific
// wording/balance-return that depends on isPackageBooking actually being
// true, which itself can only happen once packages are live.
export default function BookingCancelControl({ bookingId, canCancel, isPackageBooking, paymentStatus, packagePurchaseId }: Props) {
  const router = useRouter()
  const { t, dir } = useT()
  const copy = t.classCards
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [state, setState] = useState<State>('idle')
  const [balanceLabel, setBalanceLabel] = useState<string | null>(null)

  function openDialog() {
    setState('idle')
    dialog.current?.showModal()
  }

  async function confirm() {
    setState('cancelling')
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setState('error')
      return
    }

    const { error } = await supabase.rpc('cancel_booking', {
      p_booking_id: bookingId,
      p_user_id: user.id,
    })

    if (error) {
      if (error.message.includes('CANCELLATION_WINDOW_PASSED')) {
        setState('windowPassed')
      } else if (error.message.includes('FORBIDDEN') || error.message.includes('NOT_YOUR_BOOKING')) {
        setState('error')
      } else {
        setState('error')
      }
      return
    }

    if (isPackageBooking && packagePurchaseId) {
      const { data: purchase } = await supabase
        .from('package_purchases')
        .select('sessions_remaining, sessions_total')
        .eq('id', packagePurchaseId)
        .maybeSingle()
      const remaining = purchase?.sessions_remaining
      const total = purchase?.sessions_total
      setBalanceLabel(
        typeof remaining === 'number' && typeof total === 'number'
          ? t.classes.packages.remainingOf.replace('{remaining}', String(remaining)).replace('{total}', String(total))
          : copy.cancelSuccess,
      )
    }

    setState({ done: isPackageBooking ? 'package' : paymentStatus === 'paid' ? 'paidRegular' : 'regular' })
    router.refresh()
  }

  if (!canCancel || state === 'windowPassed') {
    return (
      <div dir={dir} className="w-full space-y-2 sm:w-auto">
        <p className="text-sm leading-6 text-[#617A55]/85">{copy.cancelWindowPassedMessage}</p>
        <div className="flex flex-wrap gap-2">
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={contactLinkStyle}>{copy.contactWhatsapp}</a>
          <a href={`tel:${PHONE_E164}`} className={contactLinkStyle}>{copy.contactCall} ({PHONE_DISPLAY})</a>
        </div>
      </div>
    )
  }

  if (typeof state === 'object') {
    const message =
      state.done === 'package' ? balanceLabel ?? copy.cancelSuccess
        : state.done === 'paidRegular' ? copy.cancelledPaidRegular
          : copy.cancelSuccess
    return <p role="status" className="text-sm leading-6 text-[#617A55]">{message}</p>
  }

  return (
    <div className="w-full space-y-2 sm:w-auto">
      <button type="button" onClick={openDialog} className={buttonStyle}>{copy.cancel}</button>
      {state === 'error' && <p role="alert" className="text-sm leading-6 text-red-700">{copy.cancelError}</p>}

      <dialog ref={dialog} dir={dir} aria-labelledby={titleId} className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-2xl border border-[#617A55]/15 bg-[#F7F6F0] p-6 text-[#25311f] backdrop:bg-[#25311f]/40">
        <h3 id={titleId} className="font-serif text-2xl">{copy.cancelTitle}</h3>
        <p className="mt-3 leading-7">{isPackageBooking ? copy.cancelPackageBody : copy.cancelRegularBody}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" disabled={state === 'cancelling'} onClick={() => dialog.current?.close()} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#617A55]/30 px-5 text-sm font-semibold text-[#617A55] disabled:opacity-60">
            {copy.close}
          </button>
          <button type="button" disabled={state === 'cancelling'} onClick={confirm} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#617A55] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
            {state === 'cancelling' ? copy.cancelLoading : copy.cancelConfirm}
          </button>
        </div>
      </dialog>
    </div>
  )
}

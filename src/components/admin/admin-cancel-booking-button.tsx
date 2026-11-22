'use client'

import { useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Props = {
  bookingId: string
  isPackageBooking: boolean
  isPaidRegular: boolean
}

const KNOWN_ERROR_MESSAGES: Record<string, string> = {
  FORBIDDEN: 'ليست لديك صلاحية لتنفيذ هذا الإجراء.',
  BOOKING_NOT_FOUND: 'لم يتم العثور على هذا الحجز.',
  ALREADY_CANCELLED: 'هذا الحجز ملغى بالفعل.',
}

// Shared between the session attendees list (attendees-client.tsx) and
// الحصص > الدفعات (domain-payments.tsx's booking rows) - a quiet,
// destructive action, deliberately separated visually from the primary
// contact/confirm actions next to it. Unlike BookingCancelControl (the
// member-facing one), this has no 12h window and no paid-booking block -
// an admin can cancel any active booking at any time.
export default function AdminCancelBookingButton({ bookingId, isPackageBooking, isPaidRegular }: Props) {
  const router = useRouter()
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [note, setNote] = useState('')

  function open() {
    setMessage(null)
    setFailed(false)
    setNote('')
    dialog.current?.showModal()
  }

  async function confirm() {
    setBusy(true)
    setMessage(null)
    try {
      const { error } = await createClient().rpc('admin_cancel_booking', {
        p_booking_id: bookingId,
        p_note: note.trim() || null,
      })
      if (error) throw error
      dialog.current?.close()
      router.refresh()
    } catch (error) {
      setFailed(true)
      const code = error instanceof Error ? error.message : ''
      setMessage(KNOWN_ERROR_MESSAGES[code] ?? 'تعذر إلغاء الحجز. حاولي مرة أخرى.')
    } finally {
      setBusy(false)
    }
  }

  const body = isPackageBooking
    ? 'ترجع الحصة إلى رصيد العضوة.'
    : isPaidRegular
      ? 'هذا حجز مدفوع. الإلغاء لا يرجّع المبلغ تلقائياً، رتّبي المبلغ مع العضوة.'
      : 'سيتم إلغاء هذا الحجز.'

  return (
    <div className="inline-block">
      <button
        type="button"
        onClick={open}
        className="inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-medium text-[#8a4a4a]/80 underline decoration-dotted underline-offset-4 transition hover:text-[#8a4a4a]"
      >
        إلغاء الحجز
      </button>

      <dialog
        ref={dialog}
        dir="rtl"
        aria-labelledby={titleId}
        className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-2xl border border-[#617A55]/15 bg-[#F7F6F0] p-6 text-[#25311f] backdrop:bg-[#25311f]/40"
      >
        <h3 id={titleId} className="font-serif text-2xl">إلغاء الحجز</h3>
        <p className="mt-3 leading-7">{body}</p>
        <label className="mt-4 block text-sm">
          ملاحظة (اختياري)
          <textarea
            value={note}
            onChange={event => setNote(event.target.value)}
            rows={2}
            className="mt-2 w-full rounded-lg border border-[#617A55]/25 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#617A55]"
          />
        </label>
        {message && (
          <p role={failed ? 'alert' : 'status'} className="mt-3 rounded-lg bg-[#C7D6E8]/50 p-3 text-sm">{message}</p>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" disabled={busy} onClick={() => dialog.current?.close()} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#617A55]/30 px-5 text-sm font-semibold text-[#617A55] disabled:opacity-60">
            تراجع
          </button>
          <button type="button" disabled={busy} onClick={confirm} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#8a4a4a] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? 'جارٍ الإلغاء...' : 'تأكيد الإلغاء'}
          </button>
        </div>
      </dialog>
    </div>
  )
}

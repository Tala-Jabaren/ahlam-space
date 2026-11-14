'use client'

import { useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cancelBooking, type CancelBookingResult } from '@/app/(public)/classes/cancel-booking'
import { useT } from '@/i18n/i18n-context'
import { CANCEL_ENABLED } from './features'
import styles from './class-card.module.css'

export default function CancelRegistrationButton({ bookingId, canCancel }: { bookingId: string; canCancel: boolean }) {
  const { t, dir } = useT()
  const copy = t.classCards
  const router = useRouter()
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CancelBookingResult | null>(null)
  if (!CANCEL_ENABLED || !canCancel) return null

  async function confirm() {
    if (!CANCEL_ENABLED || !canCancel || loading) return
    setLoading(true)
    setResult(null)
    try {
      const response = await cancelBooking(bookingId)
      setResult(response)
      if (response.ok) router.refresh()
    } catch {
      setResult({ ok: false, code: 'ERROR' })
    } finally {
      setLoading(false)
    }
  }

  const message = !result ? null : result.ok ? copy.cancelSuccess
    : result.code === 'NOT_IMPLEMENTED' ? copy.cancelUnavailable
      : result.code === 'TOO_LATE' ? copy.cancelTooLate
        : result.code === 'FORBIDDEN' ? copy.cancelForbidden : copy.cancelError

  return <>
    <button className={`${styles.button} ${styles.secondary}`} type="button" onClick={() => { setResult(null); dialog.current?.showModal() }}>{copy.cancel}</button>
    <dialog ref={dialog} dir={dir} className={styles.dialog} aria-labelledby={titleId} onCancel={event => { if (loading) event.preventDefault() }}>
      <h3 id={titleId}>{copy.cancelTitle}</h3><p>{copy.cancelPrompt}</p>
      {message && <p className={styles.feedback} role={result?.ok ? 'status' : 'alert'}>{message}</p>}
      <div className={styles.dialogActions}>
        <button type="button" className={`${styles.button} ${styles.secondary}`} disabled={loading} onClick={() => dialog.current?.close()}>{copy.close}</button>
        {!result?.ok && <button type="button" className={styles.button} disabled={loading} onClick={confirm}>{loading ? copy.cancelLoading : copy.cancelConfirm}</button>}
      </div>
    </dialog>
  </>
}

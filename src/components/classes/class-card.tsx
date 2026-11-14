'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Leaf } from 'lucide-react'
import BookSessionButton from '@/app/(public)/schedule/book-session-button'
import PaymentConfirmationBlock from '@/components/payment-confirmation-block'
import { WHATSAPP_URL } from '@/content/site-contact'
import { useT } from '@/i18n/i18n-context'
import CancelRegistrationButton from './cancel-registration-button'
import { CANCEL_ENABLED } from './features'
import type { BookingReceipt, ClassCardData } from './types'
import styles from './class-card.module.css'

export default function ClassCard({ session, headingLevel = 2 }: { session: ClassCardData; headingLevel?: 2 | 3 }) {
  const { t, dir } = useT()
  const copy = t.classCards
  const router = useRouter()
  const [imageFailed, setImageFailed] = useState(false)
  const [receipt, setReceipt] = useState<BookingReceipt | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const badge = useRef<HTMLSpanElement>(null)
  const dialogTitle = useId()
  const Heading = headingLevel === 3 ? 'h3' : 'h2'
  const name = session.name ?? t.home.sessionNameFallback
  const category = session.category === 'yoga' ? copy.yoga : session.category === 'fitness' ? copy.fitness : session.category === 'dance' ? copy.dance : session.category
  const booking = session.booking ?? (receipt ? { id: receipt.id, status: 'pending', payment_status: 'unpaid' } : null)
  const confirmed = booking?.status === 'confirmed' || booking?.payment_status === 'paid'

  function booked(value: BookingReceipt) {
    setReceipt(value)
    dialog.current?.showModal()
  }
  function closeConfirmation() {
    dialog.current?.close()
    badge.current?.focus()
    router.refresh()
  }

  return <article id={`session-${session.id}`} className={`${styles.card} ${session.requested ? styles.requested : ''}`} data-session-id={session.id} dir={dir}>
    <div className={styles.surface}>
      <div className={styles.cover}>
        {session.image && !imageFailed ? <Image src={session.image} alt={name} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" onError={() => setImageFailed(true)} />
          : <div className={styles.fallback} aria-hidden="true"><Leaf size={38} strokeWidth={1.2} /></div>}
      </div>
      <div className={styles.body}>
        {session.requested && !booking && <p className={styles.notice}>{t.classes.requestedNotice}</p>}
        {category && <p className={styles.eyebrow}>{category}</p>}
        <Heading className={styles.title}>{name}</Heading>
        <div className={styles.instructor}>
          <span className={styles.avatar} aria-hidden="true">{t.memberSchedule.instructorName.charAt(0)}</span>
          <span><span className="sr-only">{t.memberSchedule.instructorLabel}: </span>{t.memberSchedule.instructorName}</span>
        </div>
        <div className={styles.meta}>
          <span className={styles.metaInfo}>
            <time dateTime={session.startsAt ?? undefined}>{session.dateLabel}</time>
            <span aria-hidden="true"> · </span>
            <bdi dir="ltr">{session.timeLabel}</bdi>
          </span>
          {session.priceLabel !== null && <bdi className={styles.price}>{session.priceLabel}</bdi>}
        </div>
        <div className={styles.footer}>
          {booking ? <>
            <span ref={badge} tabIndex={-1} className={`${styles.badge} ${confirmed ? styles.confirmed : ''}`} role="status">{confirmed ? copy.confirmed : copy.pending}</span>
            {CANCEL_ENABLED && session.canCancel ? <CancelRegistrationButton bookingId={booking.id} canCancel={session.canCancel} />
              : <p className={styles.contact}><a href={WHATSAPP_URL}>{copy.cancelContact}</a></p>}
          </> : !session.bookingStatusKnown ? <>
            <p role="alert" className={styles.feedback}>{copy.bookingLoadError}</p>
            <button className={styles.button} type="button" onClick={() => router.refresh()}>{copy.retry}</button>
          </> : !session.isFuture ? <button type="button" className={styles.button} disabled>{copy.started}</button>
            : session.remaining <= 0 ? <button type="button" className={styles.button} disabled>{copy.full}</button>
              : <div className={styles.bookingAction}><BookSessionButton sessionId={session.id} initialRemaining={session.remaining} price={session.price ?? 0} showRemaining={false} autoOpen={session.requested && session.authenticated} isAuthenticated={session.authenticated} buttonLabel={copy.register} buttonClassName={styles.button} onBooked={booked} /></div>}
        </div>
      </div>
    </div>
    <dialog ref={dialog} dir={dir} className={styles.dialog} aria-labelledby={dialogTitle} onCancel={() => { badge.current?.focus(); router.refresh() }}>
      <h3 id={dialogTitle}>{copy.savedTitle}</h3>
      {receipt?.reference && session.price !== null ? <PaymentConfirmationBlock amount={session.price} reference={receipt.reference} />
        : <><p>{copy.savedMessage}</p>{receipt?.reference && <p><bdi dir="ltr">{receipt.reference}</bdi></p>}<Link href="/bookings">{copy.viewBookings}</Link></>}
      <div className={styles.dialogActions}><button className={styles.button} type="button" onClick={closeConfirmation}>{copy.close}</button></div>
    </dialog>
  </article>
}

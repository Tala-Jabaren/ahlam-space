'use client'

import Link from 'next/link'
import { useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, Clock, Leaf, Wallet } from 'lucide-react'
import BookSessionButton from '@/app/(public)/schedule/book-session-button'
import PaymentConfirmationBlock from '@/components/payment-confirmation-block'
import { useT } from '@/i18n/i18n-context'
import BookingCancelControl from './booking-cancel-control'
import PackageBookingButton from './package-booking-button'
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
  const booking = session.booking ?? (receipt ? { id: receipt.id, status: 'pending', payment_status: 'unpaid', package_purchase_id: null } : null)
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
        {session.image && !imageFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={session.image} alt={name} className="absolute inset-0 size-full object-cover" onError={() => setImageFailed(true)} />
        ) : <div className={styles.fallback} aria-hidden="true"><Leaf size={38} strokeWidth={1.2} /></div>}
      </div>
      <div className={styles.body}>
        {session.requested && !booking && <p className={styles.notice}>{t.classes.requestedNotice}</p>}
        {category && <p className={styles.eyebrow}>{category}</p>}
        <Heading className={styles.title}>{name}</Heading>
        {session.packageEligible === false && (
          <span className="mt-1 inline-flex w-fit items-center rounded-full bg-[#C7D6E8]/55 px-2.5 py-0.5 text-xs font-medium text-[#4f5d49]">
            {t.classCards.packageIneligible}
          </span>
        )}
        <dl className={styles.meta}>
          <div>
            <dt className="sr-only">{t.classes.dateLabel}</dt>
            <dd className={styles.metaItem}>
              <CalendarDays size={16} aria-hidden="true" />
              <time dateTime={session.startsAt ?? undefined}>{session.dateLabel}</time>
            </dd>
          </div>
          <div>
            <dt className="sr-only">{t.classes.timeLabel}</dt>
            <dd className={styles.metaItem}>
              <Clock size={16} aria-hidden="true" />
              <bdi dir="ltr">{session.timeLabel}</bdi>
            </dd>
          </div>
          {session.priceLabel !== null && (
            <div>
              <dt className="sr-only">{t.home.priceLabel}</dt>
              <dd className={styles.metaItem}>
                <Wallet size={16} aria-hidden="true" />
                <bdi className={styles.price}>{session.priceLabel}</bdi>
              </dd>
            </div>
          )}
        </dl>
        <div className={styles.instructor}>
          <span className={styles.avatar} aria-hidden="true">{t.memberSchedule.instructorName.charAt(0)}</span>
          <span><span className={styles.instructorLabel}>{t.memberSchedule.instructorLabel}</span> {t.memberSchedule.instructorName}</span>
        </div>
        <div className={styles.footer}>
          {booking ? <>
            <span ref={badge} tabIndex={-1} className={`${styles.badge} ${confirmed ? styles.confirmed : ''}`} role="status">{confirmed ? copy.confirmed : copy.pending}</span>
            <BookingCancelControl
              bookingId={booking.id}
              canCancel={session.canCancel}
              isPackageBooking={Boolean(booking.package_purchase_id)}
              paymentStatus={booking.payment_status}
              packagePurchaseId={booking.package_purchase_id}
            />
          </> : !session.bookingStatusKnown ? <>
            <p role="alert" className={styles.feedback}>{copy.bookingLoadError}</p>
            <button className={styles.button} type="button" onClick={() => router.refresh()}>{copy.retry}</button>
          </> : !session.isFuture ? <button type="button" className={styles.button} disabled>{copy.started}</button>
            : session.remaining <= 0 ? <button type="button" className={styles.button} disabled>{copy.full}</button>
              : session.packageEligible !== false && session.packageCredit ? (
                <PackageBookingButton
                  sessionId={session.id}
                  dateLabel={session.dateLabel}
                  timeLabel={session.timeLabel}
                  price={session.price ?? 0}
                  packageCredit={session.packageCredit}
                  isAuthenticated={session.authenticated}
                  onBooked={booked}
                />
              ) : (
                <div className={styles.bookingAction}><BookSessionButton sessionId={session.id} initialRemaining={session.remaining} price={session.price ?? 0} showRemaining={false} autoOpen={session.requested && session.authenticated} isAuthenticated={session.authenticated} buttonLabel={copy.register} buttonClassName={styles.button} onBooked={booked} /></div>
              )}
        </div>
      </div>
    </div>
    <dialog ref={dialog} dir={dir} className={styles.dialog} aria-labelledby={dialogTitle} onCancel={() => { badge.current?.focus(); router.refresh() }}>
      <h3 id={dialogTitle}>{receipt?.packageBalance ? copy.bookedTitle : copy.savedTitle}</h3>
      {receipt?.packageBalance ? (
        <>
          <span className="inline-flex items-center rounded-full bg-[#D6E2B6]/70 px-3 py-1 text-xs font-semibold text-[#3f5233]">{copy.paidFromPackageBadge}</span>
          <p className="mt-3 font-semibold">
            {t.classes.packages.remainingOf.replace('{remaining}', String(receipt.packageBalance.remaining)).replace('{total}', String(receipt.packageBalance.total))}
          </p>
          <div className="mt-2 flex gap-1.5" aria-hidden="true">
            {Array.from({ length: receipt.packageBalance.total }, (_, index) => (
              <span key={index} className={`h-2 flex-1 rounded-full ${index < receipt.packageBalance!.remaining ? 'bg-[#617A55]' : 'bg-[#617A55]/15'}`} />
            ))}
          </div>
          <p className="mt-3 text-sm leading-6 text-[#4f5d49]">{copy.cancelCreditNote}</p>
          <p className="mt-3"><Link href="/bookings">{copy.viewBookings}</Link></p>
          <Link href="/classes#sessions-list" className="mt-2 inline-block underline">{copy.bookAnotherSession}</Link>
        </>
      ) : receipt?.reference && session.price !== null ? <PaymentConfirmationBlock amount={session.price} reference={receipt.reference} />
        : <><p>{copy.savedMessage}</p>{receipt?.reference && <p><bdi dir="ltr">{receipt.reference}</bdi></p>}<Link href="/bookings">{copy.viewBookings}</Link></>}
      <div className={styles.dialogActions}><button className={styles.button} type="button" onClick={closeConfirmation}>{copy.close}</button></div>
    </dialog>
  </article>
}

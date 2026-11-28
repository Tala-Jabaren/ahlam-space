'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, ChevronDown, Clock, Leaf, Wallet } from 'lucide-react'
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
  // Only on a page that opted into package-awareness at all (packageEligible
  // is otherwise always undefined - see src/lib/class-cards.ts) - only
  // /member-schedule ever passes that field through now; the public
  // /classes page explicitly forces it out, keeping its plain register
  // button unchanged.
  const registerLabel = session.packageEligible !== undefined && session.priceLabel
    ? copy.registerWithPrice.replace('{price}', session.priceLabel)
    : copy.register
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
        {session.description && (
          <details className="group mt-1">
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg text-sm font-semibold text-[#465d3d] hover:underline focus-visible:outline-2 [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">{copy.learnMore}</span>
              <span className="hidden group-open:inline">{copy.hideDescription}</span>
              <ChevronDown size={16} aria-hidden="true" className="group-open:rotate-180" />
            </summary>
            <p className="rounded-lg bg-[#F7F6F0] p-3 text-sm leading-7 whitespace-pre-wrap break-words text-[#4f5d49]">
              {session.description}
            </p>
          </details>
        )}
        <div className={styles.instructor}>
          <span className={styles.avatar}>
            <Image src="/images/mainaboutpic.png" alt="" width={85} height={85} />
          </span>
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
                  sessionName={name}
                  dateLabel={session.dateLabel}
                  timeLabel={session.timeLabel}
                  price={session.price ?? 0}
                  packageCredit={session.packageCredit}
                  isAuthenticated={session.authenticated}
                  onBooked={booked}
                />
              ) : (
                <div className={styles.bookingAction}><BookSessionButton sessionId={session.id} initialRemaining={session.remaining} price={session.price ?? 0} showRemaining={false} autoOpen={session.requested && session.authenticated} isAuthenticated={session.authenticated} buttonLabel={registerLabel} buttonClassName={styles.button} onBooked={booked} /></div>
              )}
        </div>
      </div>
    </div>
    <dialog
      ref={dialog}
      dir={dir}
      className={receipt?.packageBalance ? 'm-auto w-[min(26rem,calc(100%-2rem))] rounded-[24px] border-0 bg-white p-6 text-center text-[#2B2A27] backdrop:bg-black/40' : styles.dialog}
      aria-labelledby={dialogTitle}
      onCancel={() => { badge.current?.focus(); router.refresh() }}
    >
      {receipt?.packageBalance ? (
        <>
          <div className="mx-auto flex size-[84px] items-center justify-center rounded-full bg-[#E1EEE5]" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="size-10 text-[#25513A]">
              <path fill="currentColor" d="M9.55 17.6 4 12.05l1.4-1.4 4.15 4.15 9.05-9.05 1.4 1.4Z" />
            </svg>
          </div>
          <h3 id={dialogTitle} className="mt-4 text-[28px] font-bold">{copy.bookedTitle}</h3>

          <div className="mt-4 rounded-2xl border border-[#E8E2D8] bg-white p-4 text-start">
            <p className="text-[18px] font-bold">{name}</p>
            <p className="mt-1 text-[14px] text-[#5C574F]">{session.dateLabel} · <bdi dir="ltr">{session.timeLabel}</bdi></p>
            <span className="mt-2 inline-flex items-center rounded-full bg-[#E1EEE5] px-3 py-1 text-xs font-semibold text-[#25513A]">{copy.paidFromPackageBadge}</span>
          </div>

          <div className="mt-3 rounded-2xl bg-[#617A55] p-5 text-start text-white">
            <p className="text-[44px] font-bold leading-none"><bdi>{receipt.packageBalance.remaining}</bdi></p>
            <p className="mt-1 text-[17px]">{t.classes.packages.successBalanceCaption.replace('{total}', String(receipt.packageBalance.total))}</p>
            <div className="mt-3 flex gap-1.5" aria-hidden="true">
              {Array.from({ length: receipt.packageBalance.total }, (_, index) => (
                <span key={index} className={`h-2.5 flex-1 rounded-full ${index < receipt.packageBalance!.remaining ? 'bg-white' : 'bg-white/30'}`} />
              ))}
            </div>
          </div>

          <p className="mt-4 text-[14px] leading-6 text-[#5C574F]">{t.classes.packages.successCancelNote}</p>

          <Link href="/bookings" className="mt-5 inline-flex min-h-[50px] w-full items-center justify-center rounded-xl bg-[#617A55] px-6 text-[17px] font-bold text-white transition hover:bg-[#4F6446]" onClick={closeConfirmation}>
            {t.classes.packages.myBookingsCta}
          </Link>
          <Link href="/member-schedule#sessions-list" className="mt-3 inline-block text-[15px] font-medium text-[#5C574F] underline underline-offset-4" onClick={closeConfirmation}>
            {copy.bookAnotherSession}
          </Link>
        </>
      ) : (
        <>
          <h3 id={dialogTitle}>{copy.savedTitle}</h3>
          {receipt?.reference && session.price !== null ? <PaymentConfirmationBlock amount={session.price} reference={receipt.reference} />
            : <><p>{copy.savedMessage}</p>{receipt?.reference && <p><bdi dir="ltr">{receipt.reference}</bdi></p>}<Link href="/bookings">{copy.viewBookings}</Link></>}
          <div className={styles.dialogActions}><button className={styles.button} type="button" onClick={closeConfirmation}>{copy.close}</button></div>
        </>
      )}
    </dialog>
  </article>
}

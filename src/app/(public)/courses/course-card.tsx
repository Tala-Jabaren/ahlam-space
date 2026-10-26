import Link from 'next/link'
import { BookOpen, Clock, Headphones, Lock, Video } from 'lucide-react'
import type { Dictionary } from '@/i18n/dictionaries'
import type { Locale } from '@/i18n/config'
import PaymentConfirmationBlock from '@/components/payment-confirmation-block'
import PurchaseCourseButton from './purchase-course-button'
import CourseCoverFallback from './course-cover-fallback'

export type CourseCardData = {
  id: string
  title: string
  description: string | null
  content_type: 'audio' | 'video' | 'article'
  price: number
  cover_image_url: string | null
  duration_minutes: number | null
}

const badgeIcons = { audio: Headphones, video: Video, article: BookOpen }

const buttonStyle =
  'inline-flex min-h-11 items-center justify-center rounded-lg bg-[#617A55] px-6 py-3 text-sm font-semibold text-[#F7F6F0] transition hover:bg-[#617A55]/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55]'

export default function CourseCard({
  course,
  isLoggedIn,
  purchase,
  t,
  locale,
}: {
  course: CourseCardData
  isLoggedIn: boolean
  purchase?: { status: 'pending' | 'paid'; reference: string | null }
  t: Dictionary
  locale: Locale
}) {
  const c = t.meditations
  const BadgeIcon = badgeIcons[course.content_type]
  const typeLabel =
    course.content_type === 'audio'
      ? (c?.audio ?? 'تأمل صوتي')
      : course.content_type === 'video'
        ? t.courses.list.contentTypeVideo
        : t.courses.list.contentTypeArticle
  const hasAccess = purchase?.status === 'paid'
  const formattedPrice = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 2,
  }).format(course.price)

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-[#617A55]/12 bg-[#F7F6F0] shadow-[0_1px_2px_rgba(37,49,31,0.04)] sm:flex-row sm:items-stretch">
      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden sm:aspect-auto sm:w-[38%]">
        {course.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.cover_image_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <CourseCoverFallback contentType={course.content_type} />
        )}
        <span className="absolute start-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-[#F7F6F0]/95 px-3 py-1.5 text-xs font-semibold text-[#617A55] shadow-sm">
          <BadgeIcon aria-hidden="true" strokeWidth={1.75} className="size-3.5" />
          {typeLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-6 sm:p-7">
        <h3 className="font-serif text-2xl leading-tight text-[#25311f]">{course.title}</h3>

        {course.description && (
          <p className="line-clamp-2 text-sm leading-6 text-[#617A55]/75">{course.description}</p>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-[#617A55]/80">
          {course.duration_minutes != null && (
            <span className="inline-flex items-center gap-1.5">
              <Clock aria-hidden="true" strokeWidth={1.75} className="size-4" />
              {new Intl.NumberFormat(locale).format(course.duration_minutes)} {t.common.minutesSuffix}
            </span>
          )}
          {!hasAccess && (
            <span className="inline-flex items-center gap-1.5">
              <Lock aria-hidden="true" strokeWidth={1.75} className="size-3.5" />
              {t.courses.list.accessHint}
            </span>
          )}
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-[#617A55]/12 pt-4">
          <p className="font-serif text-2xl font-semibold text-[#25311f]">
            <bdi>{formattedPrice}</bdi>
          </p>

          {course.content_type === 'audio' ? (
            <Link href={`/courses/${course.id}`} className={buttonStyle}>
              {hasAccess ? c?.listen : c?.details}
            </Link>
          ) : !isLoggedIn ? (
            <Link href="/login?returnTo=%2Fcourses" className={buttonStyle}>
              {t.courses.list.loginToBuy}
            </Link>
          ) : purchase?.status === 'paid' ? (
            <Link href={`/courses/${course.id}`} className={buttonStyle}>
              {t.courses.list.watchNow}
            </Link>
          ) : purchase?.status === 'pending' ? (
            <span className="inline-flex min-h-11 items-center rounded-full bg-[#C7D6E8] px-5 text-sm font-semibold text-[#617A55]">
              {t.courses.list.pendingPayment}
            </span>
          ) : (
            <PurchaseCourseButton courseId={course.id} price={course.price} />
          )}
        </div>

        {course.content_type !== 'audio' && isLoggedIn && purchase?.status === 'pending' && purchase.reference && (
          <PaymentConfirmationBlock amount={course.price} reference={purchase.reference} />
        )}
      </div>
    </article>
  )
}

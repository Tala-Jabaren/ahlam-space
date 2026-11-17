import Link from 'next/link'
import { BookOpen, Headphones, Lock, Video } from 'lucide-react'
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

const actionButtonStyle =
  'inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#617A55] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#617A55]/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55]'

export default function CourseCard({
  course,
  isLoggedIn,
  purchase,
  t,
  locale,
  coursesHref = '/courses',
}: {
  course: CourseCardData
  isLoggedIn: boolean
  purchase?: { status: 'pending' | 'paid'; reference: string | null }
  t: Dictionary
  locale: Locale
  coursesHref?: string
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

  const action =
    course.content_type === 'audio' ? (
      <Link href={`${coursesHref}/${course.id}`} className={actionButtonStyle}>
        {hasAccess ? c?.listen : c?.details}
      </Link>
    ) : !isLoggedIn ? (
      <Link href={`/login?returnTo=${encodeURIComponent(coursesHref)}`} className={actionButtonStyle}>
        {t.courses.list.loginToBuy}
      </Link>
    ) : purchase?.status === 'paid' ? (
      <Link href={`${coursesHref}/${course.id}`} className={actionButtonStyle}>
        {t.courses.list.watchNow}
      </Link>
    ) : purchase?.status === 'pending' ? (
      <span className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#C7D6E8] px-6 text-sm font-semibold text-[#617A55]">
        {t.courses.list.pendingPayment}
      </span>
    ) : (
      <PurchaseCourseButton courseId={course.id} price={course.price} returnTo={coursesHref} />
    )

  return (
    <article className="w-full max-w-[420px] overflow-hidden rounded-[22px] border border-[#617A55]/12 bg-white shadow-[0_1px_3px_rgba(37,49,31,0.08)]">
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        {course.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.cover_image_url} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <CourseCoverFallback contentType={course.content_type} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden="true" />
        <div className="absolute inset-x-4 bottom-4 text-white">
          <h3 className="truncate font-serif text-lg font-semibold leading-tight">{course.title}</h3>
          <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-white/80">
            <BadgeIcon aria-hidden="true" strokeWidth={1.75} className="size-3.5 shrink-0" />
            {typeLabel}
          </p>
        </div>
      </div>

      <div className="p-4">
        {course.description && (
          <p className="line-clamp-2 text-sm leading-6 text-[#617A55]/75">{course.description}</p>
        )}

        <div className={`flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[#617A55]/12 pt-3 ${course.description ? 'mt-3' : ''}`}>
          <div>
            <p className="font-serif text-lg font-semibold text-[#25311f]">
              <bdi>{formattedPrice}</bdi>
            </p>
            <p className="text-xs text-[#617A55]/70">{c?.price ?? 'السعر'}</p>
          </div>
          {course.duration_minutes != null && (
            <div>
              <p className="font-serif text-lg font-semibold text-[#25311f]">
                {new Intl.NumberFormat(locale).format(course.duration_minutes)} {t.common.minutesSuffix}
              </p>
              <p className="text-xs text-[#617A55]/70">{c?.duration ?? 'المدة'}</p>
            </div>
          )}
          {!hasAccess && (
            <span className="me-auto inline-flex items-center gap-1.5 self-start text-xs text-[#617A55]/70">
              <Lock aria-hidden="true" strokeWidth={1.75} className="size-3.5" />
              {t.courses.list.accessHint}
            </span>
          )}
        </div>

        <div className="mt-3">{action}</div>

        {course.content_type !== 'audio' && isLoggedIn && purchase?.status === 'pending' && purchase.reference && (
          <div className="mt-3">
            <PaymentConfirmationBlock amount={course.price} reference={purchase.reference} />
          </div>
        )}
      </div>
    </article>
  )
}

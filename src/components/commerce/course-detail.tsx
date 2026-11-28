import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarClock, ChevronDown, Headphones, Heart, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getT } from '@/i18n/get-t'
import { meditationsAr } from '@/i18n/meditations'
import MeditationPlayer from '@/components/meditation-player'
import PaymentConfirmationBlock from '@/components/payment-confirmation-block'
import PurchaseCourseButton from '@/app/(public)/courses/purchase-course-button'
import CourseCoverFallback from '@/app/(public)/courses/course-cover-fallback'
import { publicRoutes, type ExperienceRoutes } from '@/lib/experience-routes'
import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionaries'

export const metadata: Metadata = { robots: { index: false, follow: false } }
// Signed URLs must be freshly issued per request, never shared by page cache.
export const dynamic = 'force-dynamic'

type Course = {
  id: string
  title: string
  description: string | null
  content_type: 'video' | 'article' | 'audio'
  price: number
  cover_image_url: string | null
}
type Purchase = { id: string; status: string; reference: string | null }
type AccessStatus = {
  purchase_id: string
  paid_at: string
  access_expires_at: string
  is_access_active: boolean
}

const buttonStyle =
  'inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#617A55] px-6 py-3 text-sm font-semibold text-[#F7F6F0] transition hover:bg-[#617A55]/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55]'
const secondaryButtonStyle =
  'inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[#617A55]/30 px-6 py-3 text-sm font-semibold text-[#617A55] transition hover:bg-[#617A55]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55]'
const cardStyle = 'rounded-xl border border-[#617A55]/15 bg-[#F7F6F0] p-6'

function formatDateTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jerusalem',
  }).format(new Date(value))
}

function remainingTimeLabel(expiresAt: string, t: Dictionary['meditations']) {
  const c = t ?? meditationsAr
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return null
  const days = Math.floor(ms / (24 * 60 * 60 * 1000))
  if (days >= 1) return `${days} ${c.daysLeftSuffix}`
  const hours = Math.floor(ms / (60 * 60 * 1000))
  if (hours >= 1) return `${hours} ${c.hoursLeftSuffix}`
  return c.lessThanHourLeft
}

export default async function CoursePage({ params, routes = publicRoutes }: { params: Promise<{ id: string }>; routes?: ExperienceRoutes }) {
  const { id } = await params
  const supabase = await createClient()
  const { t, dir, locale } = await getT()
  const copy = t.meditations ?? meditationsAr
  const { data: { user } } = await supabase.auth.getUser()

  // Public metadata only: no media paths or article content before access checks.
  const { data: maybeCourse } = await supabase.from('courses')
    .select('id, title, description, content_type, price, cover_image_url')
    .eq('id', id).eq('is_active', true).maybeSingle().returns<Course>()
  if (!maybeCourse) redirect(`${routes.courses}?error=not_found`)
  // Asserted (not just narrowed) so later closures - AudioStateCard etc. -
  // see a non-nullable type too; plain flow-narrowing doesn't carry into
  // nested function declarations.
  const course = maybeCourse as Course
  const audio = course.content_type === 'audio'
  let duration: number | null = null
  if (audio) {
    const { data } = await supabase.from('courses').select('duration_minutes').eq('id', id).maybeSingle()
    duration = data?.duration_minutes ?? null
  }
  const returnTo = `${routes.courses}/${encodeURIComponent(id)}`
  // Requires an account for every content type now, not just video/article -
  // audio (meditations) used to allow anonymous browsing with an inline
  // "log in to listen" card (see the now-unreachable 'anonymous' branch of
  // AudioStateCard below), but guests are sent to log in first regardless
  // of content type.
  if (!user) redirect(`/login?returnTo=${encodeURIComponent(returnTo)}&message=login-required`)

  let purchases: Purchase[] = []
  let accessFailed = false
  let admin = false
  let accessStatus: AccessStatus | null = null
  if (user) {
    const result = await supabase.from('course_purchases').select('id, status, reference')
      .eq('user_id', user.id).eq('course_id', id).order('created_at', { ascending: false }).returns<Purchase[]>()
    purchases = result.data ?? []
    accessFailed = Boolean(result.error)
    if (audio) {
      const [{ data: profile }, accessResult] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
        // The one server-side source of truth for the 7-day window - see
        // supabase/meditation-access-expiry.sql. Re-derived on every load,
        // never cached or trusted from a previous render.
        supabase.rpc('get_meditation_access_status', { p_course_id: id }).maybeSingle(),
      ])
      admin = profile?.role === 'admin'
      if (!accessResult.error) accessStatus = (accessResult.data as AccessStatus | null) ?? null
    }
  }
  const paid = purchases.find((purchase) => purchase.status === 'paid')
  const pending = purchases.find((purchase) => purchase.status === 'pending')
  if (!audio && !paid) redirect(`${routes.courses}?error=access_denied`)

  const audioState: 'anonymous' | 'admin' | 'active' | 'expired' | 'pending' | 'not_purchased' = !user
    ? 'anonymous'
    : admin
      ? 'admin'
      : accessStatus?.is_access_active
        ? 'active'
        : accessStatus
          ? 'expired'
          : pending
            ? 'pending'
            : 'not_purchased'
  const canListen = audio && (admin || Boolean(accessStatus?.is_access_active))

  let signedUrl: string | null = null
  let article: string | null = null
  if (audio && canListen) {
    // Both RPC and Storage validate the caller's own session, without service role.
    const { data: path, error } = await supabase.rpc('get_meditation_audio_path', { p_course_id: id })
    if (!error && typeof path === 'string' && path) {
      // A signed URL, once issued, stays valid for its own TTL regardless of
      // what can_access_meditation() would say a moment later - so for a
      // non-admin whose 7-day window is about to close, the TTL is capped to
      // however much of that window is actually left (never less than a few
      // seconds, never more than the usual hour), instead of always handing
      // out a flat 1-hour URL that could outlive the access window.
      const ttlSeconds = admin || !accessStatus
        ? 3600
        : Math.min(3600, Math.max(5, Math.floor((new Date(accessStatus.access_expires_at).getTime() - Date.now()) / 1000)))
      const result = await supabase.storage.from('meditations').createSignedUrl(path, ttlSeconds)
      if (!result.error) signedUrl = result.data?.signedUrl ?? null
    }
  } else if (!audio && paid) {
    // Preserve the existing video/article purchase gate and signing mechanism.
    const { data: content } = await supabase.from('courses').select('video_url, article_body').eq('id', id).maybeSingle()
    article = content?.article_body ?? null
    if (course.content_type === 'video' && content?.video_url) {
      const result = await createAdminClient().storage.from('course-videos').createSignedUrl(content.video_url, 3600)
      if (!result.error) signedUrl = result.data?.signedUrl ?? null
    }
  }

  const priceLabel = new Intl.NumberFormat(locale, { style: 'currency', currency: 'ILS' }).format(course.price)

  function AudioStateCard() {
    if (audioState === 'anonymous') {
      return (
        <div className={cardStyle}>
          <div className="mb-3 grid size-11 place-items-center rounded-full bg-[#C7D6E8]/50 text-[#617A55]">
            <Lock aria-hidden="true" className="size-5" />
          </div>
          <p className="font-serif text-xl text-[#25311f]">{copy.loginRequiredTitle}</p>
          <p className="mt-2 text-sm leading-7 text-[#617A55]/80">{copy.loginRequiredBody}</p>
          <div className="mt-5 space-y-2">
            <Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`} className={buttonStyle}>{copy.login}</Link>
            <Link href={`/sign-up?returnTo=${encodeURIComponent(returnTo)}`} className="block text-center text-sm font-medium text-[#617A55] underline-offset-4 hover:underline">
              {copy.createAccount}
            </Link>
          </div>
        </div>
      )
    }

    if (audioState === 'not_purchased') {
      return (
        <div className={cardStyle}>
          <p className="font-serif text-3xl font-semibold text-[#25311f]"><bdi>{priceLabel}</bdi></p>
          <div className="mt-4"><PurchaseCourseButton courseId={id} price={course.price} returnTo={returnTo} successMessage={copy.waiting} /></div>
          <ul className="mt-5 space-y-2 text-sm text-[#617A55]/85">
            <li className="flex items-center gap-2"><Lock aria-hidden="true" className="size-4 shrink-0" />{copy.availableAfterConfirmation}</li>
            <li className="flex items-center gap-2"><CalendarClock aria-hidden="true" className="size-4 shrink-0" />{copy.accessWindowShort}</li>
            <li className="flex items-center gap-2"><Headphones aria-hidden="true" className="size-4 shrink-0" />{copy.listenAnyDevice}</li>
            <li className="flex items-center gap-2"><Heart aria-hidden="true" className="size-4 shrink-0" />{copy.personalUseOnly}</li>
          </ul>
        </div>
      )
    }

    if (audioState === 'pending') {
      return (
        <div className={cardStyle}>
          <p className="font-serif text-xl text-[#25311f]">{copy.pendingTitle}</p>
          <p className="mt-2 text-sm leading-7 text-[#617A55]/80">{copy.pendingBody}</p>
          {pending?.reference ? (
            <>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#617A55]/70">{copy.orderNumber}</p>
              <p className="font-mono text-sm" dir="ltr">{pending.reference}</p>
              <div className="mt-4"><PaymentConfirmationBlock amount={course.price} reference={pending.reference} /></div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#617A55]/70">{copy.nextStepsHeading}</p>
              <ol className="mt-2 space-y-1.5 text-sm leading-6 text-[#617A55]/85">
                <li>1. {copy.nextStep1}</li>
                <li>2. {copy.nextStep2}</li>
                <li>3. {copy.nextStep3}</li>
              </ol>
            </>
          ) : (
            <p role="alert" className="mt-4 text-sm">{copy.referenceMissing}</p>
          )}
        </div>
      )
    }

    if (audioState === 'expired') {
      return (
        <div className={cardStyle}>
          <p className="font-serif text-xl text-[#25311f]">{copy.expiredTitle}</p>
          <p className="mt-2 text-sm leading-7 text-[#617A55]/80">{copy.expiredBody}</p>
          {accessStatus && (
            <p className="mt-3 text-xs text-[#617A55]/70">{copy.expiredOn} {formatDateTime(accessStatus.access_expires_at, locale)}</p>
          )}
          <div className="mt-5"><PurchaseCourseButton courseId={id} price={course.price} returnTo={returnTo} successMessage={copy.waiting} /></div>
        </div>
      )
    }

    if (audioState === 'admin' || audioState === 'active') {
      const remaining = accessStatus ? remainingTimeLabel(accessStatus.access_expires_at, t.meditations) : null
      return (
        <div className={cardStyle}>
          {audioState === 'admin' && (
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#E8C7C7]/60 px-3 py-1 text-xs font-semibold text-[#8a4a4a]">
              <ShieldIcon /> {copy.adminBadge}
            </span>
          )}
          {audioState === 'active' && (
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#D6E2B6]/70 px-3 py-1 text-xs font-semibold text-[#3f5233]">
              <CheckIcon /> {copy.confirmedTitle}
            </span>
          )}
          {signedUrl ? <MeditationPlayer src={signedUrl} /> : <p role="alert" className="rounded-lg bg-[#C7D6E8]/40 p-6">{copy.audioError}</p>}
          {audioState === 'active' && accessStatus && (
            <div className="mt-4 space-y-1 text-sm text-[#617A55]/85">
              <p>{copy.availableUntil} <strong className="text-[#25311f]">{formatDateTime(accessStatus.access_expires_at, locale)}</strong></p>
              {remaining && <p>{copy.remainingLabel}: <strong className="text-[#25311f]">{remaining}</strong></p>}
              <p className="text-xs text-[#617A55]/70">{copy.closesAfterNote}</p>
            </div>
          )}
          {audioState === 'admin' && (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-[#617A55]/70">{copy.adminAccessNote}</p>
              <Link href="/admin/courses" className={secondaryButtonStyle}>{copy.editThisMeditation}</Link>
            </div>
          )}
        </div>
      )
    }

    return null
  }

  function ShieldIcon() {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4Z" />
      </svg>
    )
  }
  function CheckIcon() {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 13 4 4L19 7" />
      </svg>
    )
  }

  const typeLabel = audio ? copy.audio : course.content_type === 'video' ? t.courses.list.contentTypeVideo : t.courses.list.contentTypeArticle

  return (
    <div className="bg-[#F7F6F0] text-[#25311f]" dir={dir}>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {!audio && routes.scope === 'member' && <Link href={routes.courses} className="mb-5 inline-block text-sm underline underline-offset-4">محاضراتي</Link>}
        {audio && (
          <Link href={`${routes.courses}#meditations`} className="mb-6 inline-block text-sm underline underline-offset-4">
            {copy.back}
          </Link>
        )}

        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          {/* Main content column */}
          <div className="min-w-0">
            <div className="relative aspect-[16/9] overflow-hidden rounded-xl">
              {course.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={course.cover_image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <CourseCoverFallback contentType={course.content_type} />
              )}
              <span className="absolute start-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-[#F7F6F0]/95 px-3 py-1.5 text-xs font-semibold text-[#617A55] shadow-sm">
                {audio && <Headphones aria-hidden="true" className="size-3.5" />}
                {typeLabel}
              </span>
            </div>

            <h1 className="mt-6 break-words font-serif text-4xl leading-tight sm:text-5xl">{course.title}</h1>
            {course.description && (
              <p className="mt-3 whitespace-pre-wrap break-words text-base leading-8 text-[#617A55]/80">{course.description}</p>
            )}
            <dl className="mt-5 flex flex-wrap gap-6 text-sm">
              {audio && (
                <div><dt className="text-[#617A55]/70">{copy.duration}</dt><dd className="mt-1 font-medium">{duration ? `${new Intl.NumberFormat(locale).format(duration)} ${copy.minutes}` : copy.durationUnknown}</dd></div>
              )}
              <div><dt className="text-[#617A55]/70">{copy.price}</dt><dd className="mt-1 font-semibold"><bdi>{priceLabel}</bdi></dd></div>
            </dl>

            {/* Mobile: purchase/status card appears here, right after the
                meta row, so the CTA is visible without scrolling past the
                "about" sections. Hidden on desktop, where it lives in the
                sticky side column instead. */}
            {audio && (
              <div className="mt-6 lg:hidden">
                <AudioStateCard />
              </div>
            )}

            {!audio && (
              <div className="mt-8">
                {course.content_type === 'video' ? (
                  signedUrl
                    ? <video controls className="aspect-video w-full rounded-lg bg-black"><source src={signedUrl} />{t.courses.detail.videoUnsupported}</video>
                    : <p className="rounded-lg bg-[#C7D6E8]/40 p-8 text-center">{t.courses.detail.videoLoadError}</p>
                ) : (
                  <div className="whitespace-pre-wrap rounded-lg border border-[#617A55]/10 p-6 leading-8">{article ?? t.courses.detail.noArticleContent}</div>
                )}
              </div>
            )}

            {accessFailed && <p role="alert" className="mt-6 rounded-lg bg-[#C7D6E8]/40 p-6">{copy.accessError}</p>}

            {audio && (
              <>
                <section className="mt-10 border-t border-[#617A55]/12 pt-8">
                  <h2 className="font-serif text-2xl">{copy.aboutHeading}</h2>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#617A55]/85">
                    {course.description || copy.audio}
                  </p>
                </section>

                <section className="mt-10 border-t border-[#617A55]/12 pt-8">
                  <h2 className="font-serif text-2xl">{copy.benefitsHeading}</h2>
                  <div className="mt-5 grid gap-5 sm:grid-cols-3">
                    {[
                      { Icon: Headphones, label: copy.benefitAudio, note: copy.benefitAudioNote },
                      { Icon: Heart, label: copy.benefitSupport, note: copy.benefitSupportNote },
                      { Icon: CalendarClock, label: copy.benefitAccess, note: copy.benefitAccessNote },
                    ].map(({ Icon, label, note }) => (
                      <div key={label} className="text-center sm:text-start">
                        <span className="mx-auto grid size-11 place-items-center rounded-full bg-[#D6E2B6]/60 text-[#617A55] sm:mx-0">
                          <Icon aria-hidden="true" className="size-5" />
                        </span>
                        <p className="mt-2 text-sm font-semibold">{label}</p>
                        <p className="text-xs text-[#617A55]/70">{note}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="mt-10 border-t border-[#617A55]/12 pt-8">
                  <h2 className="font-serif text-2xl">{copy.faqHeading}</h2>
                  <div className="mt-4 space-y-2">
                    {[
                      [copy.faqPaymentQ, copy.faqPaymentA],
                      [copy.faqReviewTimeQ, copy.faqReviewTimeA],
                      [copy.faqDurationQ, copy.faqDurationA],
                    ].map(([question, answer]) => (
                      <details key={question} className="group rounded-lg border border-[#617A55]/12 p-4">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold marker:content-none">
                          {question}
                          <ChevronDown aria-hidden="true" className="size-4 shrink-0 transition group-open:rotate-180" />
                        </summary>
                        <p className="mt-2 text-sm leading-7 text-[#617A55]/80">{answer}</p>
                      </details>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>

          {/* Purchase/status card - desktop only (mobile shows it above). */}
          {audio && (
            <div className="hidden lg:sticky lg:top-24 lg:block">
              <AudioStateCard />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

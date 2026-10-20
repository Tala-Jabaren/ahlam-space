import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getT } from '@/i18n/get-t'
import { meditationsAr } from '@/i18n/meditations'
import MeditationPlayer from '@/components/meditation-player'
import PaymentConfirmationBlock from '@/components/payment-confirmation-block'
import PurchaseCourseButton from '../purchase-course-button'

export const metadata: Metadata = { robots: { index: false, follow: false } }
// Signed URLs must be freshly issued per request, never shared by page cache.
export const dynamic = 'force-dynamic'

type Course = {
  id: string
  title: string
  description: string | null
  content_type: 'video' | 'article' | 'audio'
  price: number
}
type Purchase = { id: string; status: string; reference: string | null }
const buttonStyle = 'inline-flex min-h-11 items-center justify-center rounded-lg bg-[#617A55] px-6 py-3 text-sm font-semibold text-[#F7F6F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55]'

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { t, dir, locale } = await getT()
  const copy = t.meditations ?? meditationsAr
  const { data: { user } } = await supabase.auth.getUser()

  // Public metadata only: no media paths or article content before access checks.
  const { data: course } = await supabase.from('courses')
    .select('id, title, description, content_type, price')
    .eq('id', id).eq('is_active', true).maybeSingle().returns<Course>()
  if (!course) redirect('/courses?error=not_found')
  const audio = course.content_type === 'audio'
  let duration: number | null = null
  if (audio) {
    const { data } = await supabase.from('courses').select('duration_minutes').eq('id', id).maybeSingle()
    duration = data?.duration_minutes ?? null
  }
  const returnTo = `/courses/${encodeURIComponent(id)}`
  if (!audio && !user) redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`)

  let purchases: Purchase[] = []
  let accessFailed = false
  let admin = false
  if (user) {
    const result = await supabase.from('course_purchases').select('id, status, reference')
      .eq('user_id', user.id).eq('course_id', id).returns<Purchase[]>()
    purchases = result.data ?? []
    accessFailed = Boolean(result.error)
    if (audio) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      admin = profile?.role === 'admin'
    }
  }
  const paid = purchases.find((purchase) => purchase.status === 'paid')
  const pending = purchases.find((purchase) => purchase.status === 'pending')
  const canListen = Boolean(user && (paid || admin))
  if (!audio && !paid) redirect('/courses?error=access_denied')

  let signedUrl: string | null = null
  let article: string | null = null
  if (audio && canListen) {
    // Both RPC and Storage validate the caller's own session, without service role.
    const { data: path, error } = await supabase.rpc('get_meditation_audio_path', { p_course_id: id })
    if (!error && typeof path === 'string' && path) {
      const result = await supabase.storage.from('meditations').createSignedUrl(path, 3600)
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

  return <main className="px-4 py-8 text-[#617A55] sm:px-6 lg:px-8" dir={dir}>
    <section className="mx-auto max-w-4xl">
      {audio && <Link href="/courses#meditations" className="mb-6 inline-block text-sm underline underline-offset-4">{copy.back}</Link>}
      <p className="text-sm font-semibold">{audio ? copy.audio : t.courses.detail.eyebrow}</p>
      <h1 className="mt-2 break-words font-serif text-4xl leading-tight sm:text-5xl">{course.title}</h1>
      {course.description && <p className="mt-3 whitespace-pre-wrap break-words text-base leading-8 text-[#617A55]/80">{course.description}</p>}
      {audio && <dl className="mt-5 flex flex-wrap gap-6 text-sm">
        <div><dt>{copy.duration}</dt><dd className="mt-1">{duration ? `${new Intl.NumberFormat(locale).format(duration)} ${copy.minutes}` : copy.durationUnknown}</dd></div>
        <div><dt>{copy.price}</dt><dd className="mt-1 font-semibold"><bdi>{new Intl.NumberFormat(locale, { style: 'currency', currency: 'ILS' }).format(course.price)}</bdi></dd></div>
      </dl>}
      <div className="mt-8">
        {audio ? (
          canListen ? (signedUrl ? <MeditationPlayer src={signedUrl} /> : <p role="alert" className="rounded-lg bg-[#C7D6E8]/40 p-6">{copy.audioError}</p>)
          : accessFailed ? <p role="alert" className="rounded-lg bg-[#C7D6E8]/40 p-6">{copy.accessError}</p>
          : pending ? <div className="space-y-4"><p role="status" className="text-sm leading-7">{copy.waiting}</p>{pending.reference
            ? <PaymentConfirmationBlock amount={course.price} reference={pending.reference} />
            : <p role="alert">{copy.referenceMissing}</p>}</div>
          : user ? <PurchaseCourseButton courseId={id} price={course.price} returnTo={returnTo} successMessage={copy.waiting} />
          : <Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`} className={buttonStyle}>{t.courses.list.loginToBuy}</Link>
        ) : course.content_type === 'video' ? (
          signedUrl ? <video controls className="aspect-video w-full rounded-lg bg-black"><source src={signedUrl} />{t.courses.detail.videoUnsupported}</video>
          : <p className="rounded-lg bg-[#C7D6E8]/40 p-8 text-center">{t.courses.detail.videoLoadError}</p>
        ) : <div className="whitespace-pre-wrap rounded-lg border border-[#617A55]/10 p-6 leading-8">{article ?? t.courses.detail.noArticleContent}</div>}
      </div>
    </section>
  </main>
}

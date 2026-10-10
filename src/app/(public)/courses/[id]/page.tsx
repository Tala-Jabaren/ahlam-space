import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getT } from '@/i18n/get-t'

const COURSE_VIDEO_BUCKET = 'course-videos'
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60 // 1 hour

// This page is purchase-gated (redirects unauthenticated/unpaid visitors
// before rendering any course content), so it's not meant to be publicly
// discoverable - noindex rather than exposing the course title to crawlers
// that will just get redirected anyway.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

type Course = {
  id: string
  title: string
  description: string | null
  content_type: 'video' | 'article'
  video_url: string | null
  article_body: string | null
}

type CoursePageProps = {
  params: Promise<{ id: string }>
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { t, dir } = await getT()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (!user) {
    if (userError) {
      console.error('supabase.auth.getUser() failed:', userError.message)
    }
    redirect(`/login?returnTo=${encodeURIComponent(`/courses/${id}`)}`)
  }

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, title, description, content_type, video_url, article_body')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle()
    .returns<Course>()

  if (courseError) {
    console.error('Failed to load course:', courseError.message)
  }

  if (!course) {
    redirect('/courses?error=not_found')
  }

  // Real server-side access check: only a row with status='paid' unlocks the
  // content. This runs before anything below, so an unpaid user never
  // receives the video/article in the response at all.
  const { data: paidPurchase, error: purchaseError } = await supabase
    .from('course_purchases')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', id)
    .eq('status', 'paid')
    .maybeSingle()

  if (purchaseError) {
    console.error('Failed to verify course purchase:', purchaseError.message)
  }

  if (!paidPurchase) {
    redirect('/courses?error=access_denied')
  }

  let signedVideoUrl: string | null = null

  if (course.content_type === 'video' && course.video_url) {
    const admin = createAdminClient()
    const { data: signedData, error: signError } = await admin.storage
      .from(COURSE_VIDEO_BUCKET)
      .createSignedUrl(course.video_url, SIGNED_URL_EXPIRY_SECONDS)

    if (signError) {
      console.error('Failed to create signed video URL:', signError.message)
    } else {
      signedVideoUrl = signedData.signedUrl
    }
  }

  return (
    <main className="px-4 py-8 text-[#617A55] sm:px-6 lg:px-8" dir={dir}>
      <section className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#617A55]/70">
          {t.courses.detail.eyebrow}
        </p>
        <h1 className="mt-2 font-serif text-4xl leading-tight sm:text-5xl">
          {course.title}
        </h1>
        {course.description && (
          <p className="mt-3 text-base leading-8 text-[#617A55]/80">
            {course.description}
          </p>
        )}

        <div className="mt-8 overflow-hidden rounded-lg border border-[#617A55]/10 bg-[#F7F6F0] shadow-sm">
          {course.content_type === 'video' ? (
            signedVideoUrl ? (
              <video controls className="aspect-video w-full bg-black">
                <source src={signedVideoUrl} />
                {t.courses.detail.videoUnsupported}
              </video>
            ) : (
              <div className="p-8 text-center text-sm leading-6">
                {t.courses.detail.videoLoadError}
              </div>
            )
          ) : (
            <div className="whitespace-pre-wrap p-6 text-base leading-8 sm:p-8">
              {course.article_body ?? t.courses.detail.noArticleContent}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

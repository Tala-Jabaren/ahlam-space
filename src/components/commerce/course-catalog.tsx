import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getT } from '@/i18n/get-t'
import { getLocale } from '@/i18n/get-locale'
import { getDictionary } from '@/i18n/dictionaries'
import { pageMetadata } from '@/lib/seo'
import { meditationsAr } from '@/i18n/meditations'
import type { CourseCardData } from '@/app/(public)/courses/course-card'
import ClassesBanner from '@/components/classes/classes-banner'
import CourseGrid from '@/components/commerce/course-grid'
import { publicRoutes, type ExperienceRoutes } from '@/lib/experience-routes'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = getDictionary(locale)
  // Requires an account now (see the redirect below) - nothing a crawler
  // without one could actually reach here, same reasoning as course pages.
  return { ...pageMetadata({ ...t.seo.courses, path: '/courses', locale }), robots: { index: false, follow: false } }
}

type PurchaseStatus = 'pending' | 'paid'

type CoursePurchase = {
  course_id: string
  status: PurchaseStatus
  reference: string | null
}

export default async function CoursesPage({
  searchParams,
  routes = publicRoutes,
}: {
  searchParams: Promise<{ error?: string }>
  routes?: ExperienceRoutes
}) {
  const { error: errorParam } = await searchParams
  const supabase = await createClient()
  const { t, dir, locale } = await getT()
  const copy = t.meditations ?? meditationsAr

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    console.error('supabase.auth.getUser() failed:', userError.message)
  }
  // Requires an account - guests are sent to log in first, then land back
  // here via returnTo. On the member route (routes.courses = '/member/courses')
  // the layout above already guarantees a user, so this never actually
  // fires there.
  if (!user) redirect(`/login?returnTo=${encodeURIComponent(routes.courses)}&message=login-required`)

  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('id, title, description, content_type, price, cover_image_url, duration_minutes')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .returns<CourseCardData[]>()

  if (coursesError) {
    console.error('Failed to load courses:', coursesError.message)
  }

  let purchases: CoursePurchase[] = []

  if (user) {
    const { data, error: purchasesError } = await supabase
      .from('course_purchases')
      .select('course_id, status, reference')
      .eq('user_id', user.id)
      .returns<CoursePurchase[]>()

    if (purchasesError) {
      console.error('Failed to load course purchases:', purchasesError.message)
    }

    purchases = data ?? []
  }

  const purchaseByCourseId = new Map<string, { status: PurchaseStatus; reference: string | null }>()
  for (const purchase of purchases) {
    if (purchaseByCourseId.get(purchase.course_id)?.status !== 'paid') {
      purchaseByCourseId.set(purchase.course_id, {
        status: purchase.status,
        reference: purchase.reference,
      })
    }
  }

  const allCourses = courses ?? []
  const isEmpty = !coursesError && allCourses.length === 0
  const purchasesById: Record<string, { status: PurchaseStatus; reference: string | null }> = {}
  for (const [courseId, purchase] of purchaseByCourseId) purchasesById[courseId] = purchase

  return (
    <div className="bg-[#F7F6F0] text-[#25311f]" dir={dir}>
      <ClassesBanner title={t.courses.list.heading} tagline={t.courses.list.tagline} />

      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8 sm:py-8" dir={dir}>
        {errorParam === 'access_denied' && (
          <div className="mb-8 rounded-lg bg-[#C7D6E8]/55 p-5 text-center text-sm leading-6">
            {t.courses.list.accessDeniedNotice}
          </div>
        )}
        {errorParam === 'not_found' && (
          <div className="mb-8 rounded-lg bg-[#C7D6E8]/55 p-5 text-center text-sm leading-6">
            {t.courses.list.notFoundNotice}
          </div>
        )}

        {coursesError && (
          <div className="rounded-lg bg-[#C7D6E8]/55 p-6 text-center">{t.courses.list.loadError}</div>
        )}

        {isEmpty && (
          <div className="rounded-lg bg-[#C7D6E8]/40 p-10 text-center">
            <p className="font-serif text-2xl">{t.courses.list.empty}</p>
          </div>
        )}

        {!isEmpty && !coursesError && (
          <CourseGrid
            courses={allCourses}
            purchases={purchasesById}
            isLoggedIn={Boolean(user)}
            t={t}
            locale={locale}
            coursesHref={routes.courses}
            meditationsLabel={copy.heading}
            lecturesLabel={copy.lectures}
            filterLabel={t.courses.list.filterLabel}
            comingSoonLabel={t.courses.list.comingSoon}
          />
        )}
      </div>
    </div>
  )
}

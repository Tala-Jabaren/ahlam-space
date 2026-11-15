import type { Metadata } from 'next'
import { Flower2, PlayCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getT } from '@/i18n/get-t'
import { getLocale } from '@/i18n/get-locale'
import { getDictionary } from '@/i18n/dictionaries'
import { pageMetadata } from '@/lib/seo'
import { meditationsAr } from '@/i18n/meditations'
import CourseCard, { type CourseCardData } from '@/app/(public)/courses/course-card'
import ClassesBanner from '@/components/classes/classes-banner'
import { publicRoutes, type ExperienceRoutes } from '@/lib/experience-routes'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = getDictionary(locale)
  return pageMetadata({ ...t.seo.courses, path: '/courses', locale })
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
  const meditations = allCourses.filter((course) => course.content_type === 'audio')
  const lectures = allCourses.filter((course) => course.content_type !== 'audio')
  const isEmpty = !coursesError && allCourses.length === 0

  return (
    <div className="bg-[#F7F6F0] text-[#25311f]" dir={dir}>
      {/* Member embed keeps its own plain header (no banner) - unaffected
          by the public page's banner below. */}
      {routes.scope === 'member' ? <header className="mx-auto max-w-5xl px-5 sm:px-8">
        <h1 className="font-serif text-3xl sm:text-4xl">{t.courses.list.heading}</h1>
        <p className="mt-2 text-sm leading-7 text-[#617A55]">{t.courses.list.subtitle}</p>
      </header> : <ClassesBanner title={t.courses.list.heading} tagline={t.courses.list.tagline} />}

      {routes.scope !== 'member' && (
        <div className="mx-auto max-w-5xl px-5 pt-8 sm:px-8" dir={dir}>
          <p className="text-base leading-8 text-[#4f5d49] sm:text-lg">{t.courses.list.heroDescription}</p>
          <p className="mt-2 max-w-md text-base leading-8 text-[#617A55]/85 sm:text-lg">{t.courses.list.heroSecondaryDescription}</p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#D6E2B6]/45 px-4 py-2 text-sm font-medium text-[#617A55]">
            {t.courses.list.subtitle}
          </p>
        </div>
      )}

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

        {meditations.length > 0 && (
          <section aria-labelledby="meditations-heading" id="meditations" className="scroll-mt-28">
            <div className="flex items-center gap-3">
              <Flower2 aria-hidden="true" strokeWidth={1.5} className="size-6 text-[#617A55]" />
              <h2 id="meditations-heading" className="font-serif text-3xl text-[#25311f]">
                {copy.heading}
              </h2>
            </div>
            <div className="mt-4 h-px bg-[#617A55]/15" />
            <div className="mt-7 grid gap-6">
              {meditations.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  isLoggedIn={Boolean(user)}
                  purchase={purchaseByCourseId.get(course.id)}
                  t={t}
                  locale={locale}
                  coursesHref={routes.courses}
                />
              ))}
            </div>
          </section>
        )}

        {lectures.length > 0 && (
          <section aria-labelledby="lectures-heading" id="lectures" className={`scroll-mt-28 ${meditations.length > 0 ? 'mt-14' : ''}`}>
            <div className="flex items-center gap-3">
              <PlayCircle aria-hidden="true" strokeWidth={1.5} className="size-6 text-[#617A55]" />
              <h2 id="lectures-heading" className="font-serif text-3xl text-[#25311f]">
                {copy.lectures}
              </h2>
            </div>
            <div className="mt-4 h-px bg-[#617A55]/15" />
            <div className="mt-7 grid gap-6">
              {lectures.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  isLoggedIn={Boolean(user)}
                  purchase={purchaseByCourseId.get(course.id)}
                  t={t}
                  locale={locale}
                  coursesHref={routes.courses}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

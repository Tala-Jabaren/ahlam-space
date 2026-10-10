import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PaymentConfirmationBlock from '@/components/payment-confirmation-block'
import { getT } from '@/i18n/get-t'
import { getLocale } from '@/i18n/get-locale'
import { getDictionary } from '@/i18n/dictionaries'
import { pageMetadata } from '@/lib/seo'
import PurchaseCourseButton from './purchase-course-button'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = getDictionary(locale)
  return pageMetadata({ ...t.seo.courses, path: '/courses', locale })
}

type Course = {
  id: string
  title: string
  description: string | null
  content_type: 'video' | 'article'
  price: number
  cover_image_url: string | null
}

type PurchaseStatus = 'pending' | 'paid'

type CoursePurchase = {
  course_id: string
  status: PurchaseStatus
  reference: string | null
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error: errorParam } = await searchParams
  const supabase = await createClient()
  const { t, dir } = await getT()

  function contentTypeLabel(type: Course['content_type']) {
    return type === 'video' ? t.courses.list.contentTypeVideo : t.courses.list.contentTypeArticle
  }
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    console.error('supabase.auth.getUser() failed:', userError.message)
  }

  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('id, title, description, content_type, price, cover_image_url')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .returns<Course[]>()

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

  const purchaseByCourseId = new Map<
    string,
    { status: PurchaseStatus; reference: string | null }
  >()
  for (const purchase of purchases) {
    if (purchaseByCourseId.get(purchase.course_id)?.status !== 'paid') {
      purchaseByCourseId.set(purchase.course_id, {
        status: purchase.status,
        reference: purchase.reference,
      })
    }
  }

  return (
    <main className="px-4 py-8 text-[#617A55] sm:px-6 lg:px-8" dir={dir}>
      <section className="mx-auto max-w-7xl">
        <header className="border-b border-[#617A55]/15 pb-8 sm:pb-10">
          <h1 className="font-serif text-4xl leading-tight sm:text-5xl">
            {t.courses.list.heading}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-8 text-[#617A55]/80 sm:text-lg">
            {t.courses.list.subtitle}
          </p>
        </header>

        {errorParam === 'access_denied' && (
          <div className="mt-6 rounded-lg bg-[#C7D6E8]/55 p-5 text-center text-sm leading-6">
            {t.courses.list.accessDeniedNotice}
          </div>
        )}
        {errorParam === 'not_found' && (
          <div className="mt-6 rounded-lg bg-[#C7D6E8]/55 p-5 text-center text-sm leading-6">
            {t.courses.list.notFoundNotice}
          </div>
        )}

        {coursesError && (
          <div className="mt-7 rounded-lg bg-[#C7D6E8]/55 p-6 text-center">
            {t.courses.list.loadError}
          </div>
        )}

        {!coursesError && (courses ?? []).length === 0 && (
          <div className="mt-7 rounded-lg bg-[#C7D6E8]/40 p-8 text-center">
            <p className="font-serif text-2xl">{t.courses.list.empty}</p>
          </div>
        )}

        {!coursesError && (courses ?? []).length > 0 && (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {(courses ?? []).map((course) => {
              const purchase = purchaseByCourseId.get(course.id)
              const status = purchase?.status

              return (
                <article
                  key={course.id}
                  className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-[#617A55]/10 bg-[#F7F6F0] shadow-sm"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#C7D6E8]/40">
                    {course.cover_image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={course.cover_image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                    <span className="absolute start-4 top-4 rounded-full bg-[#F7F6F0]/95 px-3 py-1 text-xs font-semibold shadow-sm">
                      {contentTypeLabel(course.content_type)}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="font-serif text-2xl leading-tight">
                      {course.title}
                    </h2>
                    {course.description && (
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#617A55]/75">
                        {course.description}
                      </p>
                    )}

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-[#617A55]/15 pt-4">
                      <p className="font-serif text-2xl font-semibold">
                        ₪{course.price}
                      </p>

                      {!user && (
                        <Link
                          href="/login?returnTo=%2Fcourses"
                          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#617A55] px-6 py-3 text-sm font-semibold text-[#F7F6F0] transition hover:bg-[#617A55]/85"
                        >
                          {t.courses.list.loginToBuy}
                        </Link>
                      )}

                      {user && status === 'paid' && (
                        <Link
                          href={`/courses/${course.id}`}
                          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#617A55] px-6 py-3 text-sm font-semibold text-[#F7F6F0] transition hover:bg-[#617A55]/85"
                        >
                          {t.courses.list.watchNow}
                        </Link>
                      )}

                      {user && status === 'pending' && (
                        <span className="inline-flex min-h-11 items-center rounded-full bg-[#C7D6E8] px-5 text-sm font-semibold text-[#617A55]">
                          {t.courses.list.pendingPayment}
                        </span>
                      )}

                      {user && !status && (
                        <PurchaseCourseButton courseId={course.id} price={course.price} />
                      )}
                    </div>

                    {user && status === 'pending' && purchase?.reference && (
                      <div className="mt-4">
                        <PaymentConfirmationBlock
                          amount={course.price}
                          reference={purchase.reference}
                        />
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}

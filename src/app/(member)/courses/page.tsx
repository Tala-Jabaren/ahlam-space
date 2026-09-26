import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PurchaseCourseButton from './purchase-course-button'

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
}

function contentTypeLabel(type: Course['content_type']) {
  return type === 'video' ? 'فيديو' : 'مقال'
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error: errorParam } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (!user) {
    if (userError) {
      console.error('supabase.auth.getUser() failed:', userError.message)
    }
    redirect('/login')
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

  const { data: purchases, error: purchasesError } = await supabase
    .from('course_purchases')
    .select('course_id, status')
    .eq('user_id', user.id)
    .returns<CoursePurchase[]>()

  if (purchasesError) {
    console.error('Failed to load course purchases:', purchasesError.message)
  }

  const purchaseByCourseId = new Map<string, PurchaseStatus>()
  for (const purchase of purchases ?? []) {
    if (purchaseByCourseId.get(purchase.course_id) !== 'paid') {
      purchaseByCourseId.set(purchase.course_id, purchase.status)
    }
  }

  return (
    <main className="px-4 py-8 text-[#617A55] sm:px-6 lg:px-8" dir="rtl">
      <section className="mx-auto max-w-7xl">
        <header className="border-b border-[#617A55]/15 pb-8 sm:pb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#617A55]/70">
            Member area
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">
            كورسات ومحاضرات
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-8 text-[#617A55]/80 sm:text-lg">
            اختاري الكورس المناسب، ثم حددي طريقة الدفع. تبقى طلبات الشراء قيد
            الانتظار حتى يتم تأكيد الدفع يدويًا.
          </p>
        </header>

        {errorParam === 'access_denied' && (
          <div className="mt-6 rounded-lg bg-[#C7D6E8]/55 p-5 text-center text-sm leading-6">
            لا يمكنك الوصول إلى هذا المحتوى بعد، يجب إتمام الشراء وتأكيد الدفع
            أولاً.
          </div>
        )}
        {errorParam === 'not_found' && (
          <div className="mt-6 rounded-lg bg-[#C7D6E8]/55 p-5 text-center text-sm leading-6">
            هذا الكورس غير متاح حاليًا.
          </div>
        )}

        {coursesError && (
          <div className="mt-7 rounded-lg bg-[#C7D6E8]/55 p-6 text-center">
            تعذر تحميل الكورسات الآن.
          </div>
        )}

        {!coursesError && (courses ?? []).length === 0 && (
          <div className="mt-7 rounded-lg bg-[#C7D6E8]/40 p-8 text-center">
            <p className="font-serif text-2xl">
              لا توجد كورسات متاحة للشراء حاليًا.
            </p>
          </div>
        )}

        {!coursesError && (courses ?? []).length > 0 && (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {(courses ?? []).map((course) => {
              const status = purchaseByCourseId.get(course.id)

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
                    <span className="absolute left-4 top-4 rounded-full bg-[#F7F6F0]/95 px-3 py-1 text-xs font-semibold shadow-sm">
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

                    <div className="mt-auto flex items-center justify-between gap-4 border-t border-[#617A55]/15 pt-4">
                      <p className="font-serif text-2xl font-semibold">
                        ₪{course.price}
                      </p>

                      {status === 'paid' && (
                        <Link
                          href={`/courses/${course.id}`}
                          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#617A55] px-6 py-3 text-sm font-semibold text-[#F7F6F0] transition hover:bg-[#617A55]/85"
                        >
                          مشاهدة الآن
                        </Link>
                      )}

                      {status === 'pending' && (
                        <span className="inline-flex min-h-11 items-center rounded-full bg-[#C7D6E8] px-5 text-sm font-semibold text-[#617A55]">
                          بانتظار تأكيد الدفع
                        </span>
                      )}

                      {!status && <PurchaseCourseButton courseId={course.id} />}
                    </div>
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

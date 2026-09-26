import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PurchaseCourseButton from './purchase-course-button'

type CourseRow = {
  id: string
  title?: string | null
  name?: string | null
  description: string | null
  price: number | null
  is_active: boolean | null
}

export default async function CoursesPage() {
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

  const { data: courses, error } = await supabase
    .from('courses')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .returns<CourseRow[]>()

  if (error) {
    console.error('Failed to load courses:', error.message)
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

        {error && (
          <div className="mt-7 rounded-lg bg-[#C7D6E8]/55 p-6 text-center">
            تعذر تحميل الكورسات الآن.
          </div>
        )}

        {!error && (!courses || courses.length === 0) && (
          <div className="mt-7 rounded-lg bg-[#C7D6E8]/40 p-8 text-center">
            <p className="font-serif text-2xl">
              لا توجد كورسات متاحة للشراء حاليًا.
            </p>
          </div>
        )}

        {!error && courses && courses.length > 0 && (
          <div className="mt-7 grid gap-5 lg:grid-cols-2">
            {courses.map((course) => {
              const title = course.title ?? course.name ?? 'كورس'

              return (
                <article
                  key={course.id}
                  className="flex min-w-0 flex-col rounded-lg border border-[#617A55]/10 bg-[#F7F6F0] p-5 shadow-sm sm:p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="break-words font-serif text-2xl leading-tight text-[#25311f] sm:text-3xl">
                        {title}
                      </h2>
                      {course.description && (
                        <p className="mt-3 text-sm leading-7 text-[#617A55]/75">
                          {course.description}
                        </p>
                      )}
                    </div>
                    <span className="inline-flex min-h-10 shrink-0 items-center self-start rounded-full bg-[#C7D6E8] px-4 text-sm font-semibold text-[#617A55]">
                      {course.price ?? '-'} ₪
                    </span>
                  </div>

                  <div className="mt-auto border-t border-[#617A55]/15 pt-5">
                    <PurchaseCourseButton courseId={course.id} />
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

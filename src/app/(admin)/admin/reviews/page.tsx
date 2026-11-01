import { getAdminSession } from '@/components/admin/admin-session'
import ReviewEditor from '@/components/admin/review-editor'
import type { ReviewRow } from '@/lib/reviews'

export default async function AdminReviewsPage() {
  const supabase = await getAdminSession()
  const { data, error } = await supabase
    .from('reviews')
    .select('id, display_order, name, body, lang, approved, sensitive, photo_url, created_at')
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
    .returns<ReviewRow[]>()

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="border-b border-[#617A55]/15 pb-6 font-serif text-3xl text-[#617A55]">آراء المشاركات</h1>
      <p className="mt-4 text-sm leading-7 text-[#617A55]/80">
        فقط المراجعات الموافق عليها تظهر في قسم «آراء المشاركات» على الصفحة الرئيسية. راجعي كل مراجعة مع المشاركة قبل الموافقة عليها.
      </p>

      <div className="mt-6">
        <ReviewEditor />
      </div>

      <div className="mt-6 grid gap-5">
        {error ? (
          <p role="alert" className="rounded-lg bg-[#C7D6E8]/50 p-5">تعذر تحميل المراجعات. تحققي من صلاحيات العرض والاتصال.</p>
        ) : !data?.length ? (
          <p className="rounded-lg bg-[#D6E2B6]/35 p-5 text-center text-sm text-[#617A55]">لا توجد مراجعات بعد.</p>
        ) : (
          data.map((review) => <ReviewEditor key={review.id} record={review} />)
        )}
      </div>
    </main>
  )
}

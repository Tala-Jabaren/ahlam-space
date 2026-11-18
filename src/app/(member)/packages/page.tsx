import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PACKAGES_ENABLED } from '@/lib/feature-flags'
import PaymentConfirmationBlock from '@/components/payment-confirmation-block'

type PurchaseRow = {
  id: string
  status: string
  reference: string
  price_snapshot: number
  sessions_total: number
  sessions_remaining: number
  payment_method: string | null
  created_at: string | null
  paid_at: string | null
  expires_at: string | null
  class_packages: { name: string; description: string | null } | null
}

function formatAmount(value: number) {
  return `${new Intl.NumberFormat('ar').format(value)} ₪`
}

function formatDate(value: string | null) {
  if (!value) return null
  return new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jerusalem' }).format(new Date(value))
}

function statusInfo(purchase: PurchaseRow) {
  if (purchase.status === 'cancelled') return { label: 'ملغاة', tone: 'bg-[#617A55]/10 text-[#617A55]/70' }
  if (purchase.status !== 'paid') return { label: 'بانتظار الدفع', tone: 'bg-[#C7D6E8] text-[#617A55]' }
  const expired = purchase.expires_at ? new Date(purchase.expires_at).getTime() < Date.now() : false
  if (expired || purchase.sessions_remaining <= 0) return { label: 'منتهية', tone: 'bg-[#617A55]/10 text-[#617A55]/70' }
  return { label: 'فعّالة', tone: 'bg-[#617A55] text-[#F7F6F0]' }
}

// Same page shape as /bookings (header, card list, same status-chip and
// PaymentConfirmationBlock reuse) - this route only exists at all while
// PACKAGES_ENABLED is on; notFound() below is what keeps a stale link/
// bookmark from reaching it (or ever querying package_purchases) once the
// flag is off again.
export default async function MyPackagesPage() {
  if (!PACKAGES_ENABLED) {
    notFound()
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (!user) {
    if (userError) {
      console.error('supabase.auth.getUser() failed:', userError.message)
    }
    redirect('/login?message=session-expired')
  }

  const { data: purchases, error } = await supabase
    .from('package_purchases')
    .select('id, status, reference, price_snapshot, sessions_total, sessions_remaining, payment_method, created_at, paid_at, expires_at, class_packages(name, description)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .returns<PurchaseRow[]>()

  if (error) {
    console.error('Failed to load package purchases:', error.message)
  }

  return (
    <main className="px-4 py-8 text-[#617A55] sm:px-6 lg:px-8" dir="rtl">
      <section className="mx-auto max-w-5xl">
        <header className="border-b border-[#617A55]/15 pb-8">
          <h1 className="font-serif text-4xl leading-tight sm:text-5xl">باقاتي</h1>
          <p className="mt-3 text-base leading-8 text-[#617A55]/80 sm:text-lg">
            تابعي باقاتك وحالة الدفع وعدد الحصص المتبقية في كل باقة.
          </p>
        </header>

        {error && (
          <div className="mt-7 rounded-lg bg-[#C7D6E8]/55 p-6 text-center">تعذر تحميل الباقات الآن.</div>
        )}

        {!error && (purchases ?? []).length === 0 && (
          <div className="mt-7 rounded-lg bg-[#C7D6E8]/40 p-8 text-center">
            <p className="font-serif text-2xl">لا توجد باقات حتى الآن.</p>
            <Link href="/classes?view=packages" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#617A55] px-7 py-3 text-sm font-semibold text-[#F7F6F0] transition hover:bg-[#617A55]/85">
              تصفحي الباقات
            </Link>
          </div>
        )}

        {!error && (purchases ?? []).length > 0 && (
          <div className="mt-7 grid gap-5">
            {(purchases ?? []).map((purchase) => {
              const status = statusInfo(purchase)
              const expiresLabel = formatDate(purchase.expires_at)
              return (
                <article key={purchase.id} className="overflow-hidden rounded-lg border border-[#617A55]/10 bg-[#F7F6F0] p-5 shadow-sm sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="break-words font-serif text-2xl text-[#25311f]">{purchase.class_packages?.name ?? 'باقة'}</h2>
                      {purchase.class_packages?.description && (
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#617A55]/75">{purchase.class_packages.description}</p>
                      )}
                    </div>
                    <span className={`inline-flex min-h-10 shrink-0 items-center self-start rounded-full px-4 text-sm font-semibold ${status.tone}`}>
                      {status.label}
                    </span>
                  </div>

                  <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-[#617A55]/70">الحصص المتبقية</dt>
                      <dd className="mt-1 font-semibold text-[#25311f]">{purchase.sessions_remaining} / {purchase.sessions_total}</dd>
                    </div>
                    <div>
                      <dt className="text-[#617A55]/70">المبلغ</dt>
                      <dd className="mt-1 font-semibold text-[#25311f]"><bdi>{formatAmount(purchase.price_snapshot)}</bdi></dd>
                    </div>
                    {expiresLabel && (
                      <div>
                        <dt className="text-[#617A55]/70">تنتهي في</dt>
                        <dd className="mt-1 font-semibold text-[#25311f]">{expiresLabel}</dd>
                      </div>
                    )}
                  </dl>

                  {purchase.status === 'pending' && (
                    <div className="mt-5">
                      <PaymentConfirmationBlock amount={purchase.price_snapshot} reference={purchase.reference} />
                      <div className="mt-3 rounded-lg border border-[#617A55]/15 bg-white p-4 text-sm leading-7 text-[#25311f]">
                        <p className="font-semibold">أو الدفع في الاستوديو</p>
                        <p className="mt-1">
                          اذكري رقم المرجع التالي عند الدفع نقدًا في الاستوديو:{' '}
                          <strong className="font-mono" dir="ltr">{purchase.reference}</strong>
                        </p>
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}

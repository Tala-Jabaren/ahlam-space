import Link from 'next/link'
import { getAdminSession } from '@/components/admin/admin-session'
import { createAdminClient } from '@/lib/supabase/admin'
import ConfirmPackagePayment from '@/components/admin/confirm-package-payment'
import NotificationItem from '@/components/admin/notifications/notification-item'
import NotificationBadge from '@/components/admin/notifications/notification-badge'
import { getAdminNotificationCounts } from '@/components/admin/notifications/notification-data'

type PurchaseRow = {
  id: string
  user_id: string
  status: string
  reference: string
  price_snapshot: number
  sessions_total: number
  sessions_remaining: number
  created_at: string | null
  class_packages: { name: string } | null
}

type ProfileRow = { id: string; full_name: string | null; phone: string | null }

type PackageFilter = 'unpaid' | 'paid' | 'all'

const filterOptions: Array<{ value: PackageFilter; label: string }> = [
  { value: 'unpaid', label: 'غير مدفوع' },
  { value: 'paid', label: 'مدفوع' },
  { value: 'all', label: 'الكل' },
]

function formatAmount(value: number) {
  return `${new Intl.NumberFormat('ar').format(value)} ₪`
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jerusalem' }).format(new Date(value))
}

// Deliberately separate from DomainPayments rather than a 4th kind grafted
// onto it - this query only ever runs because this component is itself
// only ever rendered when PACKAGES_ENABLED is on (see
// src/app/(admin)/admin/classes/page.tsx), so DomainPayments' own
// booking/course/order query stays exactly as it was regardless of the
// flag.
export default async function PackagePayments({ filter, selectedId }: { filter?: string; selectedId?: string }) {
  const activeFilter: PackageFilter = filter === 'paid' || filter === 'all' ? filter : 'unpaid'
  await getAdminSession()
  const { counts, available } = await getAdminNotificationCounts()
  const unseenCount = counts.package_purchase
  const admin = createAdminClient()

  const { data: purchases, error } = await admin
    .from('package_purchases')
    .select('id, user_id, status, reference, price_snapshot, sessions_total, sessions_remaining, created_at, class_packages(name)')
    .order('created_at', { ascending: false })
    .returns<PurchaseRow[]>()

  if (error) {
    return (
      <section>
        <h2 className="font-serif text-xl text-[#617A55] sm:text-2xl">دفعات الباقات</h2>
        <p className="mt-6 rounded-lg bg-[#C7D6E8]/55 p-5 text-center text-sm leading-7">تعذر تحميل دفعات الباقات. تحققي من صلاحيات العرض والاتصال.</p>
      </section>
    )
  }

  const userIds = Array.from(new Set((purchases ?? []).map(row => row.user_id)))
  const profilesResult = userIds.length
    ? await admin.from('profiles').select('id, full_name, phone').in('id', userIds).returns<ProfileRow[]>()
    : { data: [] as ProfileRow[] }
  const profiles = new Map((profilesResult.data ?? []).map(profile => [profile.id, profile]))

  const visiblePurchases = (purchases ?? []).filter(purchase => {
    if (activeFilter === 'all') return true
    return activeFilter === 'paid' ? purchase.status === 'paid' : purchase.status !== 'paid'
  })

  return (
    <section>
      <header className="border-t border-[#617A55]/15 pt-8">
        <h2 className="flex items-center gap-2 font-serif text-xl text-[#617A55] sm:text-2xl">
          دفعات الباقات
          <NotificationBadge count={unseenCount} />
        </h2>
        <p className="mt-3 max-w-2xl leading-7 text-[#617A55]/80">راجعي طلبات شراء الباقات وأكديها بعد التحقق من التحويل أو الاستلام في الاستوديو.</p>
      </header>

      <div className="mt-4 flex flex-wrap gap-2" aria-label="حالة دفعات الباقات">
        {filterOptions.map(option => (
          <Link
            key={option.value}
            href={`/admin/classes?tab=packages&pfilter=${option.value}`}
            aria-current={activeFilter === option.value ? 'page' : undefined}
            className={`inline-flex min-h-11 items-center rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeFilter === option.value ? 'bg-[#617A55] text-[#F7F6F0]' : 'text-[#617A55] hover:bg-[#C7D6E8]/35'
            }`}
          >
            {option.label}
          </Link>
        ))}
      </div>

      {!visiblePurchases.length ? (
        <p className="mt-6 rounded-lg bg-[#D6E2B6]/45 p-8 text-center text-lg text-[#617A55]">لا توجد طلبات شراء باقات تطابق هذا التصنيف.</p>
      ) : (
        <div className="mt-6 grid gap-4">
          {visiblePurchases.map(purchase => {
            const profile = profiles.get(purchase.user_id)
            const isPaid = purchase.status === 'paid'
            const isSelected = selectedId === purchase.id
            const customerName = profile?.full_name?.trim() || 'عميلة مسجلة'
            const packageName = purchase.class_packages?.name ?? 'باقة'
            const status = isPaid ? 'مدفوع' : purchase.status === 'cancelled' ? 'ملغي' : 'بانتظار الدفع'
            return (
              <NotificationItem
                key={purchase.id}
                kind="package_purchase"
                id={purchase.id}
                title={`${customerName} · ${packageName}`}
                preview={`${formatAmount(purchase.price_snapshot)} · ${formatDate(purchase.created_at)}`}
                status={status}
                initiallyOpen={isSelected}
                enabled={available}
              >
                <article
                  className={`rounded-lg border bg-white p-5 shadow-sm sm:p-6 ${isSelected ? 'border-[#617A55] ring-2 ring-[#617A55]/35' : 'border-[#617A55]/12'}`}
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-serif text-2xl text-[#25311f]">{packageName}</h3>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isPaid ? 'bg-[#D6E2B6]' : purchase.status === 'cancelled' ? 'bg-[#617A55]/10' : 'bg-[#C7D6E8]'}`}>
                          {status}
                        </span>
                      </div>
                      <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                        <Info label="الاسم" value={customerName} />
                        <Info label="الهاتف" value={profile?.phone?.trim() || '-'} ltr />
                        <Info label="عدد الحصص" value={String(purchase.sessions_total)} />
                        <Info label="الحصص المتبقية" value={`${purchase.sessions_remaining} من ${purchase.sessions_total}`} />
                        <Info label="المبلغ" value={formatAmount(purchase.price_snapshot)} />
                        <Info label="تاريخ الإنشاء" value={formatDate(purchase.created_at)} />
                        <Info label="المرجع" value={purchase.reference} ltr />
                      </dl>
                    </div>
                    <div className="shrink-0">
                      <ConfirmPackagePayment purchaseId={purchase.id} label={packageName} disabled={isPaid || purchase.status === 'cancelled'} />
                    </div>
                  </div>
                </article>
              </NotificationItem>
            )
          })}
        </div>
      )}
    </section>
  )
}

function Info({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold text-[#617A55]/65">{label}</dt>
      <dd className="mt-1 break-words text-[#25311f]" dir={ltr ? 'ltr' : undefined}>{value}</dd>
    </div>
  )
}

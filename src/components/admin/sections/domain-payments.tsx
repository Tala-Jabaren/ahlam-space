import NotificationItem from '@/components/admin/notifications/notification-item'
import NotificationBadge from '@/components/admin/notifications/notification-badge'
import { getAdminNotificationCounts, getUnseenNotificationCount } from '@/components/admin/notifications/notification-data'
import { getAdminSession } from '@/components/admin/admin-session'
import AdminDeleteButton from '@/components/admin/admin-delete-button'
import Link from 'next/link'
import AdminRpcButton from '@/components/admin/admin-rpc-button'
import { createAdminClient } from '@/lib/supabase/admin'

type PaymentKind = 'booking' | 'course' | 'order'
type PaymentFilter = 'unpaid' | 'paid' | 'all'

type Customer = {
  name: string
  phone: string
  email: string
}

type PaymentRow = {
  id: string
  kind: PaymentKind
  customer: Customer
  item: string
  amount: number
  reference: string
  createdAt: string | null
  status: string
  isPaid: boolean
}

type BookingRow = {
  id: string
  user_id: string
  created_at: string | null
  payment_status: string
  class_sessions: {
    classes: { name: string; price: number } | null
  } | null
}

type CourseRow = {
  id: string
  user_id: string
  created_at: string | null
  status: string
  courses: { title: string; price: number } | null
}

type OrderRow = {
  id: string
  user_id: string | null
  created_at: string | null
  status: string
  total: number
  guest_name: string | null
  guest_phone: string | null
  guest_email: string | null
  order_items: Array<{
    quantity: number
    product_variants: { products: { name: string } | null } | null
  }>
}

type ProfileRow = {
  id: string
  full_name: string | null
  phone: string | null
}

type PaymentReferenceRow = {
  booking_id: string | null
  order_id: string | null
  gateway_reference: string | null
}

const filterOptions: Array<{ value: PaymentFilter; label: string }> = [
  { value: 'unpaid', label: 'غير مدفوع' },
  { value: 'paid', label: 'مدفوع' },
  { value: 'all', label: 'الكل' },
]

function formatAmount(value: number) {
  return `${new Intl.NumberFormat('ar').format(value)} ₪`
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ar', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jerusalem',
  }).format(new Date(value))
}

function statusLabel(status: string, isPaid: boolean) {
  if (isPaid) return 'مدفوع'
  if (status === 'cancelled') return 'ملغي'
  return 'بانتظار الدفع'
}

export default async function DomainPayments({ kind, filter, selectedId, heading, showOwnBadge = false }: {
  kind: PaymentKind; filter?: string; selectedId?: string
  // Both optional and unused by the course/shop call sites, which keep
  // their exact current output - only /admin/classes passes these, where
  // this block now shares its tab with PackagePayments and needs its own
  // label/count to tell the two apart.
  heading?: string; showOwnBadge?: boolean
}) {
  await getAdminSession()
  const { available } = await getAdminNotificationCounts()
  const ownUnseenCount = showOwnBadge ? await getUnseenNotificationCount(kind === 'course' ? 'course_purchase' : kind) : 0
  const activeTab = kind
  const activeFilter: PaymentFilter = filter === 'paid' || filter === 'all' ? filter : 'unpaid'
  const sectionHref = kind === 'booking' ? '/admin/classes' : kind === 'course' ? '/admin/courses' : '/admin/products'

  const admin = createAdminClient()
  const [bookingsResult, coursesResult, ordersResult, referencesResult] =
    await Promise.all([
      admin
        .from('bookings')
        .select(
          'id, user_id, created_at, payment_status, class_sessions(classes(name, price))'
        )
        .order('created_at', { ascending: false })
        .match(selectedId && activeTab === 'booking' ? { id: selectedId } : {})
        .returns<BookingRow[]>(),
      admin
        .from('course_purchases')
        .select('id, user_id, created_at, status, courses(title, price)')
        .order('created_at', { ascending: false })
        .match(selectedId && activeTab === 'course' ? { id: selectedId } : {})
        .returns<CourseRow[]>(),
      admin
        .from('orders')
        .select(
          'id, user_id, created_at, status, total, guest_name, guest_phone, guest_email, order_items(quantity, product_variants(products(name)))'
        )
        .order('created_at', { ascending: false })
        .match(selectedId && activeTab === 'order' ? { id: selectedId } : {})
        .returns<OrderRow[]>(),
      admin
        .from('payments')
        .select('booking_id, order_id, gateway_reference')
        .returns<PaymentReferenceRow[]>(),
    ])

  const allUserIds = Array.from(
    new Set(
      [
        ...(bookingsResult.data ?? []).map((row) => row.user_id),
        ...(coursesResult.data ?? []).map((row) => row.user_id),
        ...(ordersResult.data ?? []).map((row) => row.user_id),
      ].filter((id): id is string => Boolean(id))
    )
  )

  const profilesResult = allUserIds.length
    ? await admin
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', allUserIds)
        .returns<ProfileRow[]>()
    : { data: [] as ProfileRow[], error: null }

  const profiles = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile])
  )
  const emails = new Map<string, string>()
  await Promise.all(
    allUserIds.map(async (userId) => {
      const { data } = await admin.auth.admin.getUserById(userId)
      if (data.user?.email) emails.set(userId, data.user.email)
    })
  )

  function registeredCustomer(userId: string): Customer {
    const profile = profiles.get(userId)
    return {
      name: profile?.full_name?.trim() || 'عميلة مسجلة',
      phone: profile?.phone?.trim() || '-',
      email: emails.get(userId) || '-',
    }
  }

  const bookingReferences = new Map(
    (referencesResult.data ?? [])
      .filter((row) => row.booking_id)
      .map((row) => [row.booking_id as string, row.gateway_reference])
  )
  const orderReferences = new Map(
    (referencesResult.data ?? [])
      .filter((row) => row.order_id)
      .map((row) => [row.order_id as string, row.gateway_reference])
  )

  const rowsByKind: Record<PaymentKind, PaymentRow[]> = {
    booking: (bookingsResult.data ?? []).map((booking) => ({
      id: booking.id,
      kind: 'booking',
      customer: registeredCustomer(booking.user_id),
      item: booking.class_sessions?.classes?.name ?? 'حجز حصة',
      amount: booking.class_sessions?.classes?.price ?? 0,
      reference: bookingReferences.get(booking.id) || booking.id,
      createdAt: booking.created_at,
      status: booking.payment_status,
      isPaid: booking.payment_status === 'paid',
    })),
    course: (coursesResult.data ?? []).map((purchase) => ({
      id: purchase.id,
      kind: 'course',
      customer: registeredCustomer(purchase.user_id),
      item: purchase.courses?.title ?? 'شراء كورس',
      amount: purchase.courses?.price ?? 0,
      reference: purchase.id,
      createdAt: purchase.created_at,
      status: purchase.status,
      isPaid: purchase.status === 'paid',
    })),
    order: (ordersResult.data ?? []).map((order) => ({
      id: order.id,
      kind: 'order',
      customer: order.user_id
        ? registeredCustomer(order.user_id)
        : {
            name: order.guest_name?.trim() || 'ضيفة',
            phone: order.guest_phone?.trim() || '-',
            email: order.guest_email?.trim() || '-',
          },
      item:
        order.order_items
          .map((item) => item.product_variants?.products?.name)
          .filter(Boolean)
          .join('، ') || 'طلب متجر',
      amount: order.total,
      reference: orderReferences.get(order.id) || order.id,
      createdAt: order.created_at,
      status: order.status,
      isPaid: ['paid', 'processing', 'shipped', 'delivered'].includes(
        order.status
      ),
    })),
  }

  const visibleRows = rowsByKind[activeTab].filter((row) => {
    if (activeFilter === 'all') return true
    return activeFilter === 'paid' ? row.isPaid : !row.isPaid
  })
  const pageError =
    bookingsResult.error ||
    coursesResult.error ||
    ordersResult.error ||
    referencesResult.error ||
    profilesResult.error

  return (
    <section>
      <header className="border-b border-[#617A55]/15 pb-5">
        <h2 className="mt-2 flex items-center gap-2 font-serif text-xl text-[#617A55] sm:text-2xl">
          {heading ?? 'المدفوعات'}
          {showOwnBadge && <NotificationBadge count={ownUnseenCount} />}
        </h2>
        <p className="mt-3 max-w-2xl leading-7 text-[#617A55]/80">
          راجعي الدفعات المعلّقة وأكديها بعد التحقق من التحويل أو الاستلام.
        </p>
      </header>

      <div className="mt-4 flex flex-wrap gap-2" aria-label="حالة الدفع">
        {filterOptions.map((filter) => (
          <Link
            key={filter.value}
            href={`${sectionHref}?tab=payments&filter=${filter.value}`}
            aria-current={activeFilter === filter.value ? 'page' : undefined}
            className={`inline-flex min-h-11 items-center rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeFilter === filter.value
                ? 'bg-[#D6E2B6] text-[#25311f]'
                : 'text-[#617A55] hover:bg-[#C7D6E8]/35'
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {selectedId && !rowsByKind[activeTab].some(row => row.id === selectedId) && !pageError && <p role="status" className="mt-4 rounded-lg bg-[#C7D6E8]/40 p-4 text-sm">العنصر المطلوب غير متاح حاليًا. يمكنك مراجعة بقية الدفعات.</p>}
      {pageError && (
        <p className="mt-6 rounded-lg bg-[#C7D6E8]/55 p-5 text-center text-sm leading-7">
          تعذر تحميل بعض بيانات المدفوعات. تأكدي من اكتمال الجداول والصلاحيات ثم حاولي مرة أخرى.
        </p>
      )}

      {!pageError && visibleRows.length === 0 && (
        <p className="mt-6 rounded-lg bg-[#D6E2B6]/45 p-8 text-center text-lg text-[#617A55]">
          لا توجد مدفوعات ضمن هذا التصنيف.
        </p>
      )}

      {!pageError && visibleRows.length > 0 && (
        <div className="mt-6 grid gap-4">
          {visibleRows.map((row) => (
            <NotificationItem key={`${row.kind}-${row.id}-${selectedId === row.id}`} kind={row.kind === 'course' ? 'course_purchase' : row.kind} id={row.id} title={`${row.customer.name} · ${row.item}`} preview={`${formatAmount(row.amount)} · ${formatDate(row.createdAt)}`} status={statusLabel(row.status, row.isPaid)} initiallyOpen={selectedId === row.id} enabled={available}>
            <article
              className="rounded-lg border border-[#617A55]/12 bg-white p-5 shadow-sm sm:p-6"
            >
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-serif text-2xl text-[#25311f]">
                      {row.item}
                    </h2>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        row.isPaid ? 'bg-[#D6E2B6]' : 'bg-[#C7D6E8]'
                      }`}
                    >
                      {statusLabel(row.status, row.isPaid)}
                    </span>
                  </div>

                  <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <Info label="الاسم" value={row.customer.name} />
                    <Info label="الهاتف" value={row.customer.phone} ltr />
                    <Info label="البريد الإلكتروني" value={row.customer.email} ltr />
                    <Info label="المبلغ" value={formatAmount(row.amount)} />
                    <Info label="تاريخ الإنشاء" value={formatDate(row.createdAt)} />
                    <Info label="المرجع" value={row.reference} ltr />
                  </dl>
                </div>

                <div className="flex flex-wrap items-start gap-3">
                <AdminRpcButton
                  rpcName="admin_confirm_payment"
                  args={{ p_kind: row.kind, p_id: row.id }}
                  label="تأكيد الدفع"
                  confirmMessage={`هل أنتِ متأكدة من تأكيد دفع ${row.item}؟`}
                  successMessage="تم تأكيد الدفع بنجاح."
                  disabled={row.isPaid || row.status === 'cancelled'}
                />
                <div className="ms-auto border-s border-[#617A55]/15 ps-4"><AdminDeleteButton kind={row.kind === 'course' ? 'course_purchase' : row.kind} id={row.id} label={`${row.item} / ${row.customer.name}`} /></div>
                </div>
              </div>
            </article>
            </NotificationItem>
          ))}
        </div>
      )}
    </section>
  )
}

function Info({
  label,
  value,
  ltr = false,
}: {
  label: string
  value: string
  ltr?: boolean
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold text-[#617A55]/65">{label}</dt>
      <dd className="mt-1 break-words text-[#25311f]" dir={ltr ? 'ltr' : undefined}>
        {value}
      </dd>
    </div>
  )
}

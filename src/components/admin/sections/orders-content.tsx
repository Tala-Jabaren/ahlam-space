import NotificationItem from '@/components/admin/notifications/notification-item'
import { getAdminNotificationCounts } from '@/components/admin/notifications/notification-data'
import { getAdminSession } from '@/components/admin/admin-session'
import AdminDeleteButton from '@/components/admin/admin-delete-button'
import AdminRpcButton from '@/components/admin/admin-rpc-button'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEmailsByIds } from '@/lib/admin-user-emails'

type OrderRow = {
  id: string
  user_id: string | null
  created_at: string | null
  status: string
  fulfillment_method: string | null
  payment_method: string | null
  delivery_address: string | null
  guest_name: string | null
  guest_phone: string | null
  guest_email: string | null
  total: number
  order_items: Array<{
    id: string
    quantity: number
    unit_price: number
    product_variants: {
      size: string | null
      color: string | null
      products: { name: string } | null
    } | null
  }>
}

type ProfileRow = {
  id: string
  full_name: string | null
  phone: string | null
}

const statusLabels: Record<string, string> = {
  pending: 'قيد الانتظار',
  paid: 'مدفوع',
  processing: 'قيد التجهيز',
  shipped: 'تم الشحن',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
}

const paymentLabels: Record<string, string> = {
  bank_transfer: 'حوالة بنكية',
  cash_at_studio: 'الدفع عند الاستلام',
  card_gateway: 'دفع إلكتروني',
}

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

export default async function OrdersContent({ selectedId }: { selectedId?: string }) {
  await getAdminSession()
  const admin = createAdminClient()
  // getAdminNotificationCounts() is independent of the orders query - run
  // them together instead of waiting on the counts first.
  const [{ available }, { data: orders, error }] = await Promise.all([
    getAdminNotificationCounts(),
    admin
      .from('orders')
      .select(
        'id, user_id, created_at, status, fulfillment_method, payment_method, delivery_address, guest_name, guest_phone, guest_email, total, order_items(id, quantity, unit_price, product_variants(size, color, products(name)))'
      )
      .order('created_at', { ascending: false })
      .match(selectedId ? { id: selectedId } : {})
      .returns<OrderRow[]>(),
  ])

  const userIds = Array.from(
    new Set(
      (orders ?? [])
        .map((order) => order.user_id)
        .filter((id): id is string => Boolean(id))
    )
  )
  const [profilesResult, emails] = await Promise.all([
    userIds.length
      ? admin
          .from('profiles')
          .select('id, full_name, phone')
          .in('id', userIds)
          .returns<ProfileRow[]>()
      : Promise.resolve({ data: [] as ProfileRow[], error: null }),
    getEmailsByIds(admin, userIds),
  ])
  const profiles = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile])
  )

  return (
    <section>
      <header className="flex flex-col gap-5 border-b border-[#617A55]/15 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="mt-2 font-serif text-xl text-[#617A55] sm:text-2xl">
            الطلبات
          </h2>
          <p className="mt-3 max-w-2xl leading-7 text-[#617A55]/80">
            راجعي تفاصيل طلبات المتجر وألغِي الطلبات غير المكتملة مع إعادة المخزون تلقائيًا.
          </p>
        </div>
        <AdminRpcButton
          rpcName="expire_unpaid_orders"
          args={{ p_hours: 48 }}
          label="إلغاء غير المدفوع الأقدم من 48 ساعة"
          confirmMessage="هل تريدين إلغاء كل الطلبات غير المدفوعة الأقدم من 48 ساعة وإعادة مخزونها؟"
          successMessage="تمت معالجة الطلبات القديمة بنجاح."
          tone="secondary"
        />
      </header>

      {(error || profilesResult.error) && (
        <p className="mt-6 rounded-lg bg-[#C7D6E8]/55 p-5 text-center text-sm leading-7">
          تعذر تحميل الطلبات. تأكدي من اكتمال حقول الطلبات والصلاحيات ثم حاولي مرة أخرى.
        </p>
      )}

      {!error && !profilesResult.error && (orders?.length ?? 0) === 0 && (
        <p className="mt-6 rounded-lg bg-[#D6E2B6]/45 p-8 text-center text-lg text-[#617A55]">
          لا توجد طلبات حتى الآن.
        </p>
      )}

      {!error && !profilesResult.error && orders && orders.length > 0 && (
        <div className="mt-6 grid gap-5">
          {orders.map((order) => {
            const profile = order.user_id ? profiles.get(order.user_id) : null
            const name = order.user_id
              ? profile?.full_name?.trim() || 'عميلة مسجلة'
              : order.guest_name?.trim() || 'ضيفة'
            const phone = order.user_id
              ? profile?.phone?.trim() || '-'
              : order.guest_phone?.trim() || '-'
            const email = order.user_id
              ? emails.get(order.user_id) || '-'
              : order.guest_email?.trim() || '-'

            return (
              <NotificationItem key={`${order.id}-${selectedId === order.id}`} kind="order" id={order.id} title={name} preview={`${formatAmount(order.total)} · ${formatDate(order.created_at)}`} status={statusLabels[order.status] ?? order.status} initiallyOpen={selectedId === order.id} enabled={available}>
              <article
                className="overflow-hidden rounded-lg border border-[#617A55]/12 bg-white shadow-sm"
              >
                <header className="flex flex-col gap-4 bg-[#D6E2B6]/30 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#617A55]/65">
                      رقم الطلب
                    </p>
                    <p className="mt-1 break-all font-medium" dir="ltr">
                      {order.id}
                    </p>
                    <p className="mt-2 text-sm text-[#617A55]">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                  <span
                    className={`self-start rounded-full px-4 py-2 text-sm font-semibold ${
                      order.status === 'cancelled'
                        ? 'border border-[#617A55]/25 text-[#617A55]/70'
                        : order.status === 'delivered'
                          ? 'bg-[#617A55] text-[#F7F6F0]'
                          : 'bg-[#C7D6E8] text-[#25311f]'
                    }`}
                  >
                    {statusLabels[order.status] ?? order.status}
                  </span>
                </header>

                <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(250px,0.45fr)]">
                  <div className="min-w-0">
                    <h2 className="font-serif text-xl text-[#25311f]">
                      محتويات الطلب
                    </h2>
                    <ul className="mt-3 divide-y divide-[#617A55]/12">
                      {order.order_items.map((item) => {
                        const variant = item.product_variants
                        const details = [variant?.size, variant?.color].filter(
                          Boolean
                        )
                        return (
                          <li
                            key={item.id}
                            className="grid gap-2 py-3 first:pt-0 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-5"
                          >
                            <div>
                              <p className="font-semibold text-[#25311f]">
                                {variant?.products?.name ?? 'منتج'}
                              </p>
                              {details.length > 0 && (
                                <p className="mt-1 text-sm text-[#617A55]/70">
                                  {details.join(' · ')}
                                </p>
                              )}
                            </div>
                            <p className="text-sm">الكمية: {item.quantity}</p>
                            <p className="text-sm font-semibold" dir="ltr">
                              {formatAmount(item.unit_price)}
                            </p>
                          </li>
                        )
                      })}
                    </ul>
                  </div>

                  <dl className="grid content-start gap-3 rounded-lg bg-[#F7F6F0] p-4 text-sm">
                    <Info label="العميلة" value={name} />
                    <Info label="الهاتف" value={phone} ltr />
                    <Info label="البريد الإلكتروني" value={email} ltr />
                    <Info
                      label="الاستلام"
                      value={
                        order.fulfillment_method === 'delivery'
                          ? 'توصيل'
                          : 'استلام من الاستوديو'
                      }
                    />
                    {order.fulfillment_method === 'delivery' && (
                      <Info
                        label="عنوان التوصيل"
                        value={order.delivery_address?.trim() || '-'}
                      />
                    )}
                    <Info
                      label="طريقة الدفع"
                      value={
                        paymentLabels[order.payment_method ?? ''] ??
                        order.payment_method ??
                        '-'
                      }
                    />
                  </dl>
                </div>

                <footer className="flex flex-col gap-4 border-t border-[#617A55]/12 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <p className="text-lg font-semibold text-[#25311f]">
                    الإجمالي: <span dir="ltr">{formatAmount(order.total)}</span>
                  </p>
                  <div className="flex flex-wrap items-start gap-3">
                  <AdminRpcButton
                    rpcName="admin_cancel_order"
                    args={{ p_order_id: order.id }}
                    label="إلغاء وإعادة المخزون"
                    confirmMessage={`هل أنتِ متأكدة من إلغاء طلب ${order.id} وإعادة مخزونه؟`}
                    successMessage="تم إلغاء الطلب وإعادة المخزون بنجاح."
                    tone="danger"
                    disabled={order.status === 'cancelled'}
                  />
                  <AdminDeleteButton kind="order" id={order.id} label={`طلب ${order.id}`} />
                  </div>
                </footer>
              </article>
              </NotificationItem>
            )
          })}
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

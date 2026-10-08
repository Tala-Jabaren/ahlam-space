import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PaymentConfirmationBlock from '@/components/payment-confirmation-block'

type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

type OrderRow = {
  id: string
  created_at: string | null
  status: OrderStatus
  fulfillment_method: 'delivery' | 'pickup' | null
  delivery_address: string | null
  total: number
  reference: string | null
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

const statusLabels: Record<OrderStatus, string> = {
  pending: 'قيد الانتظار',
  paid: 'مدفوع',
  processing: 'قيد التجهيز',
  shipped: 'تم الشحن',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
}

const statusStyles: Record<OrderStatus, string> = {
  pending: 'bg-[#C7D6E8]/60',
  paid: 'bg-[#D6E2B6]/75',
  processing: 'bg-[#C7D6E8]/60',
  shipped: 'bg-[#D6E2B6]/75',
  delivered: 'bg-[#617A55] text-[#F7F6F0]',
  cancelled: 'border border-[#617A55]/20 bg-transparent text-[#617A55]/70',
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('ar', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Jerusalem',
  }).format(new Date(value))
}

export default async function MyOrdersPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (!user) {
    if (userError) {
      console.error('supabase.auth.getUser() failed:', userError.message)
    }
    redirect('/login?returnTo=/orders')
  }

  const { data: orders, error } = await supabase
    .from('orders')
    .select(
      'id, created_at, status, fulfillment_method, delivery_address, total, reference, order_items(id, quantity, unit_price, product_variants(size, color, products(name)))'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .returns<OrderRow[]>()

  if (error) {
    console.error('Failed to load orders:', error.message)
  }

  return (
    <main className="px-4 py-8 text-[#617A55] sm:px-6 lg:px-8" dir="rtl">
      <section className="mx-auto max-w-7xl">
        <header className="border-b border-[#617A55]/15 pb-8 sm:pb-10">
          <h1 className="font-serif text-4xl leading-tight sm:text-5xl">طلباتي</h1>
          <p className="mt-3 max-w-2xl text-base leading-8 text-[#617A55]/80 sm:text-lg">
            تابعي طلباتك، تفاصيل المنتجات، وحالة تجهيز كل طلب.
          </p>
        </header>

        {error && (
          <div className="mt-7 rounded-lg bg-[#C7D6E8]/55 p-6 text-center">
            تعذر تحميل الطلبات الآن. حاولي مرة أخرى لاحقًا.
          </div>
        )}

        {!error && (orders?.length ?? 0) === 0 && (
          <div className="mt-7 rounded-lg bg-[#C7D6E8]/40 p-8 text-center sm:p-10">
            <p className="font-serif text-2xl">لا توجد طلبات بعد</p>
            <Link
              href="/shop"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#617A55] px-7 py-3 text-sm font-semibold text-[#F7F6F0] transition hover:bg-[#617A55]/85"
            >
              تصفحي المتجر
            </Link>
          </div>
        )}

        {!error && orders && orders.length > 0 && (
          <div className="mt-7 grid gap-5">
            {orders.map((order) => (
              <article
                key={order.id}
                className="overflow-hidden rounded-lg border border-[#617A55]/12 bg-white shadow-sm"
              >
                <header className="flex flex-col gap-4 border-b border-[#617A55]/12 bg-[#D6E2B6]/25 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div>
                    <p className="text-xs font-semibold text-[#617A55]/65">
                      رقم الطلب
                    </p>
                    <p className="mt-1 break-all font-medium" dir="ltr">
                      {order.id}
                    </p>
                    <p className="mt-2 text-sm text-[#617A55]/75">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex min-h-10 items-center self-start rounded-full px-4 text-sm font-semibold ${statusStyles[order.status]}`}
                  >
                    {statusLabels[order.status] ?? order.status}
                  </span>
                </header>

                <div className="p-5 sm:p-6">
                  <ul className="divide-y divide-[#617A55]/12">
                    {order.order_items.map((item) => {
                      const variant = item.product_variants
                      const details = [variant?.size, variant?.color].filter(Boolean)

                      return (
                        <li
                          key={item.id}
                          className="grid gap-3 py-4 first:pt-0 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-8"
                        >
                          <div className="min-w-0">
                            <h2 className="break-words text-lg font-semibold text-[#25311f]">
                              {variant?.products?.name ?? 'منتج'}
                            </h2>
                            {details.length > 0 && (
                              <p className="mt-1 text-sm text-[#617A55]/70">
                                {details.join(' · ')}
                              </p>
                            )}
                          </div>
                          <p className="text-sm">
                            الكمية: <strong>{item.quantity}</strong>
                          </p>
                          <p className="text-sm font-semibold text-[#25311f]" dir="ltr">
                            {formatPrice(item.unit_price)}
                          </p>
                        </li>
                      )
                    })}
                  </ul>

                  <div className="mt-2 grid gap-4 border-t border-[#617A55]/15 pt-5 sm:grid-cols-[1fr_auto] sm:items-end">
                    <dl className="grid gap-2 text-sm">
                      <div className="flex flex-wrap gap-2">
                        <dt className="font-semibold text-[#25311f]">طريقة الاستلام:</dt>
                        <dd>
                          {order.fulfillment_method === 'delivery'
                            ? 'توصيل'
                            : 'استلام من الاستوديو'}
                        </dd>
                      </div>
                      {order.fulfillment_method === 'delivery' &&
                        order.delivery_address && (
                          <div className="flex min-w-0 flex-wrap gap-2">
                            <dt className="font-semibold text-[#25311f]">عنوان التوصيل:</dt>
                            <dd className="min-w-0 break-words">{order.delivery_address}</dd>
                          </div>
                        )}
                    </dl>
                    <div className="flex items-center justify-between gap-5 sm:justify-end">
                      <span className="font-semibold text-[#25311f]">الإجمالي</span>
                      <strong className="text-xl text-[#25311f]" dir="ltr">
                        {formatPrice(order.total)}
                      </strong>
                    </div>
                  </div>

                  {order.status === 'pending' && order.reference && (
                    <div className="mt-5">
                      <PaymentConfirmationBlock
                        amount={order.total}
                        reference={order.reference}
                      />
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

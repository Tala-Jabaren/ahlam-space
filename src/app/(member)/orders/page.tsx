import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ShoppingBag } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import PaymentConfirmationBlock from '@/components/payment-confirmation-block'
import { memberRoutes } from '@/lib/experience-routes'

type OrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
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
      products: { name: string; image_url: string | null } | null
    } | null
  }>
}

const statusLabels: Record<OrderStatus, string> = {
  pending: 'بانتظار الدفع', paid: 'تم الدفع', processing: 'قيد التجهيز',
  shipped: 'تم الشحن', delivered: 'تم التسليم', cancelled: 'ملغي',
}
const statusStyles: Record<OrderStatus, string> = {
  pending: 'bg-[#C7D6E8]/60 text-[#25311f]',
  paid: 'bg-[#D6E2B6]/75 text-[#25311f]',
  processing: 'bg-[#C7D6E8]/60 text-[#25311f]',
  shipped: 'bg-[#D6E2B6]/75 text-[#25311f]',
  delivered: 'bg-[#617A55] text-[#F7F6F0]',
  cancelled: 'border border-[#617A55]/20 text-[#617A55]/70',
}
const money = new Intl.NumberFormat('ar', { style: 'currency', currency: 'ILS' })
const number = new Intl.NumberFormat('ar')
function dateLabel(value: string | null) {
  if (!value || Number.isNaN(new Date(value).getTime())) return 'تاريخ غير متاح'
  return new Intl.DateTimeFormat('ar', { dateStyle: 'long', timeZone: 'Asia/Jerusalem' }).format(new Date(value))
}

export default async function MyOrdersPage() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (!user) {
    if (userError) console.error('supabase.auth.getUser() failed:', userError.message)
    redirect('/login?returnTo=/orders')
  }
  const { data: orders, error } = await supabase.from('orders')
    .select('id, created_at, status, fulfillment_method, delivery_address, total, reference, order_items(id, quantity, unit_price, product_variants(size, color, products(name, image_url)))')
    .eq('user_id', user.id).order('created_at', { ascending: false }).returns<OrderRow[]>()
  if (error) console.error('Failed to load orders:', error.message)

  return <main className="px-4 py-6 text-[#617A55] sm:px-6 sm:py-8 lg:px-8" dir="rtl">
    <section className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#617A55]/15 pb-6">
        <div><h1 className="font-serif text-3xl leading-tight sm:text-4xl">طلباتي</h1>
          <p className="mt-2 text-sm leading-7">كل طلباتك وتحديثاتها في مكان واحد.</p></div>
        <Link href={memberRoutes.shop} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#617A55]/25 px-4 py-2 text-sm hover:bg-[#D6E2B6]/40 focus-visible:outline-2 focus-visible:outline-[#617A55]">
          <ShoppingBag aria-hidden="true" size={18} />المتجر
        </Link>
      </header>
      {error && <p role="alert" className="mt-6 rounded-lg bg-[#C7D6E8]/45 p-6">تعذر تحميل الطلبات الآن. حاولي مرة أخرى لاحقًا.</p>}
      {!error && !orders?.length && <div className="py-16 text-center">
        <ShoppingBag aria-hidden="true" className="mx-auto mb-5 text-[#617A55]/65" size={36} strokeWidth={1.5} />
        <h2 className="font-serif text-2xl">لا توجد طلبات بعد</h2><p className="mt-3 text-sm">ابدئي باختيار شيء تحبينه من المتجر.</p>
        <Link href={memberRoutes.shop} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#617A55] px-6 py-3 text-sm font-semibold text-white hover:bg-[#617A55]/90">تصفحي المتجر</Link>
      </div>}
      {!error && <div className="mt-6 grid gap-5">
        {orders?.map((order) => <article key={order.id} className="min-w-0 overflow-hidden rounded-lg border border-[#617A55]/15 bg-white">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#617A55]/10 px-5 py-5 sm:px-6">
            <div className="min-w-0"><h2 className="text-xl font-semibold text-[#25311f]"><span className="me-2 text-sm font-normal text-[#617A55]">طلب</span><bdi>{order.reference || 'قيد المتابعة'}</bdi></h2>
              <p className="mt-2 text-sm">{dateLabel(order.created_at)}</p></div>
            <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyles[order.status] ?? ''}`}>{statusLabels[order.status] ?? 'قيد المتابعة'}</span>
          </header>
          <div className="px-5 py-2 sm:px-6">
            <ul className="divide-y divide-[#617A55]/10">
              {order.order_items.map((item) => {
                const product = item.product_variants?.products
                return <li key={item.id} className="flex min-w-0 items-center gap-3 py-4">
                  <div className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded bg-[#D6E2B6]/35">
                    {product?.image_url ? <Image src={product.image_url} alt={product.name} fill sizes="56px" className="object-cover" /> : <ShoppingBag size={20} aria-hidden="true" className="text-[#617A55]/60" />}
                  </div>
                  <div className="min-w-0 flex-1"><p className="break-words text-sm font-medium text-[#25311f]">{product?.name || 'منتج'}</p>
                    <p className="mt-1 text-xs">{[item.product_variants?.size, item.product_variants?.color].filter(Boolean).join(' · ')}</p></div>
                  <p className="shrink-0 text-sm">الكمية: {number.format(item.quantity)}</p>
                </li>
              })}
            </ul>
            <div className="flex flex-wrap items-end justify-between gap-4 border-t border-[#617A55]/15 py-5">
              <div className="min-w-0 text-sm leading-7"><p>{order.fulfillment_method === 'delivery' ? 'توصيل' : order.fulfillment_method === 'pickup' ? 'استلام من الاستوديو' : ''}</p>
                {order.fulfillment_method === 'delivery' && order.delivery_address && <p className="break-words text-xs">{order.delivery_address}</p>}</div>
              <p className="flex items-center gap-4 text-sm text-[#25311f]">الإجمالي <strong className="text-xl"><bdi>{money.format(order.total)}</bdi></strong></p>
            </div>
            {order.status === 'pending' && order.reference && <section className="border-t border-[#617A55]/10 py-5">
              <h3 className="text-sm font-semibold text-[#25311f]">الخطوة التالية</h3>
              <p className="mb-4 mt-2 text-sm leading-7">أكملي الحوالة البنكية مع كتابة مرجع الطلب. سنحدّث حالة طلبك بعد تأكيد استلامها.</p>
              <PaymentConfirmationBlock amount={order.total} reference={order.reference} showAdminWarning={false} />
            </section>}
          </div>
        </article>)}
      </div>}
    </section>
  </main>
}

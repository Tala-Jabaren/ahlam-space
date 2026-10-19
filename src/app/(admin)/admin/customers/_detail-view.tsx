import Link from 'next/link'
import { ArrowRight, ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import type { CustomerDetail, GuestDetail } from '@/lib/admin-customers'

const money = new Intl.NumberFormat('ar', { style: 'currency', currency: 'ILS' })
const number = new Intl.NumberFormat('ar')
const dates = new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeZone: 'Asia/Jerusalem' })
const times = new Intl.DateTimeFormat('ar', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
const labels: Record<string, string> = {
  pending: 'قيد الانتظار', paid: 'مدفوع', unpaid: 'غير مدفوع', processing: 'قيد التجهيز',
  shipped: 'تم الشحن', delivered: 'تم التسليم', cancelled: 'ملغي', confirmed: 'مؤكد',
  booked: 'محجوز', completed: 'مكتمل', refunded: 'مسترد', failed: 'فشل الدفع',
  bank_transfer: 'حوالة بنكية', cash_at_studio: 'الدفع عند الاستلام', card_gateway: 'دفع إلكتروني',
  delivery: 'توصيل', pickup: 'استلام من الاستوديو',
}

function date(value: string | null, dateOnly = false) {
  if (!value) return '-'
  const parsed = new Date(dateOnly ? `${value}T12:00:00Z` : value)
  return Number.isNaN(parsed.getTime()) ? '-' : dates.format(parsed)
}

function time(value: string) {
  const parsed = new Date(`1970-01-01T${value.length === 5 ? `${value}:00` : value}Z`)
  return Number.isNaN(parsed.getTime()) ? '-' : times.format(parsed)
}

function Status({ value }: { value: string }) {
  const paid = ['paid', 'confirmed', 'completed', 'delivered'].includes(value)
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium text-[#617A55] ${paid ? 'bg-[#D6E2B6]' : 'bg-[#C7D6E8]/40'}`}>{labels[value] ?? 'حالة غير معروفة'}</span>
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0"><dt className="text-xs text-[#617A55]">{label}</dt><dd className="mt-1 break-words text-sm"><bdi>{children || '-'}</bdi></dd></div>
}

function Section({ title, empty, children }: { title: string; empty: boolean; children: ReactNode }) {
  return <section className="mt-8 border-t border-[#617A55]/15 pt-6">
    <h2 className="mb-4 text-xl font-medium text-[#617A55]">{title}</h2>
    {empty ? <p className="py-6 text-sm text-[#617A55]">{title === 'الطلبات' ? 'لا توجد طلبات بعد.' : title === 'حجوزات الحصص' ? 'لا توجد حجوزات حصص بعد.' : 'لا توجد مشتريات محاضرات بعد.'}</p> : <div className="grid gap-4">{children}</div>}
  </section>
}

export default function CustomerDetailView({ detail, backHref }: {
  detail: CustomerDetail | GuestDetail
  backHref: string
}) {
  const profile = 'profile' in detail ? detail.profile : null
  const guest = 'guest' in detail ? detail.guest : null
  const name = profile?.full_name ?? guest?.guest_name ?? 'بدون اسم'
  const bookings = 'bookings' in detail ? detail.bookings : []
  const courses = 'course_purchases' in detail ? detail.course_purchases : []
  const stats = [
    ['الطلبات', number.format(profile?.orders_count ?? guest?.orders_count ?? 0)],
    ['إجمالي المشتريات', money.format(profile?.total_spent ?? guest?.total_spent ?? 0)],
    ...(profile ? [['حجوزات الحصص', number.format(bookings.length)], ['المحاضرات', number.format(courses.length)]] : []),
  ]
  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <Link href={backHref} className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm text-[#617A55] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55]">
      <ArrowRight size={16} aria-hidden="true" />العودة إلى الزبائن
    </Link>
    <header className="rounded-lg border border-[#617A55]/15 bg-white p-5 sm:p-6">
      <p className="mb-2 text-xs text-[#617A55]">{profile ? 'زبون مسجّل' : 'زبون بدون حساب'}</p>
      <h1 className="break-words text-2xl font-medium text-[#617A55] sm:text-3xl">{name}</h1>
      <dl className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="البريد الإلكتروني">{profile?.email ?? guest?.guest_email}</Info>
        <Info label="رقم الهاتف">{profile?.phone ?? guest?.guest_phone}</Info>
        {profile && <><Info label="المدينة">{profile.city}</Info><Info label="تاريخ التسجيل">{date(profile.registered_at)}</Info></>}
      </dl>
    </header>
    <dl className={`mt-6 grid grid-cols-2 gap-4 ${profile ? 'lg:grid-cols-4' : ''}`}>
      {stats.map(([label, value]) => <div key={label} className="min-w-0 border-b-2 border-[#D6E2B6] px-1 py-4">
        <dt className="text-xs text-[#617A55]">{label}</dt><dd className="mt-2 break-words text-xl font-medium"><bdi>{value}</bdi></dd>
      </div>)}
    </dl>

    <Section title="الطلبات" empty={!detail.orders.length}>
      {detail.orders.map((order) => <article key={order.id} className="min-w-0 rounded-lg border border-[#617A55]/15 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="min-w-0 break-all text-sm font-medium">طلب <bdi>{order.reference ?? order.id}</bdi></h3><Status value={order.status} /></div>
        <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="تاريخ الطلب">{date(order.created_at)}</Info>
          <Info label="طريقة الدفع">{order.payment_method ? labels[order.payment_method] ?? 'غير محددة' : '-'}</Info>
          <Info label="طريقة الاستلام">{order.fulfillment_method ? labels[order.fulfillment_method] ?? 'غير محددة' : '-'}</Info>
          <Info label="الإجمالي">{money.format(order.total)}</Info>
          {order.fulfillment_method === 'delivery' && <Info label="عنوان التوصيل">{order.delivery_address}</Info>}
        </dl>
        <details className="group mt-5 border-t border-[#617A55]/15 pt-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded text-sm text-[#617A55] focus-visible:outline-2 focus-visible:outline-[#617A55] [&::-webkit-details-marker]:hidden">
            منتجات الطلب ({number.format(order.items.length)})<ChevronDown size={16} aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
          </summary>
          {order.items.length ? <ul className="mt-3 divide-y divide-[#617A55]/10">
            {order.items.map((item, index) => <li key={index} className="grid min-w-0 gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0"><p className="break-words font-medium">{item.product_name}</p>{item.variant_label && <p className="mt-1 break-words text-xs text-[#617A55]">{item.variant_label}</p>}</div>
              <dl className="flex flex-wrap gap-x-6 gap-y-3"><Info label="الكمية">{number.format(item.quantity)}</Info><Info label="سعر الوحدة">{money.format(item.unit_price)}</Info></dl>
            </li>)}
          </ul> : <p className="py-4 text-sm">لا تتوفر تفاصيل المنتجات.</p>}
        </details>
      </article>)}
    </Section>

    {profile && <>
      <Section title="حجوزات الحصص" empty={!bookings.length}>
        {bookings.map((booking) => <article key={booking.id} className="min-w-0 rounded-lg border border-[#617A55]/15 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="break-words font-medium">{booking.class_name}</h3><Status value={booking.status} /></div>
          <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="المرجع">{booking.reference ?? booking.id}</Info>
            <Info label="تاريخ الحجز">{date(booking.created_at)}</Info>
            <Info label="موعد الحصة">{date(booking.session_date, true)}</Info>
            <Info label="الوقت">{time(booking.start_time)} - {time(booking.end_time)}</Info>
            <Info label="حالة الدفع"><Status value={booking.payment_status} /></Info>
          </dl>
        </article>)}
      </Section>
      <Section title="مشتريات المحاضرات" empty={!courses.length}>
        {courses.map((course) => <article key={course.id} className="min-w-0 rounded-lg border border-[#617A55]/15 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="break-words font-medium">{course.course_title}</h3><Status value={course.status} /></div>
          <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="المرجع">{course.reference ?? course.id}</Info><Info label="تاريخ الشراء">{date(course.created_at)}</Info>
            <Info label="السعر">{money.format(course.price)}</Info><Info label="تاريخ الدفع">{date(course.paid_at)}</Info>
          </dl>
        </article>)}
      </Section>
    </>}
  </main>
}

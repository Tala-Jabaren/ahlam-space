import Link from 'next/link'
import NotificationItem from '@/components/admin/notifications/notification-item'
import { getAdminNotificationCounts } from '@/components/admin/notifications/notification-data'
import AdminDeleteButton from '@/components/admin/admin-delete-button'
import { getAdminSession } from '@/components/admin/admin-session'
import RequestStatusSelect from '@/components/admin/request-status-select'
import { formatPreferredSlot } from '@/lib/private-session-preferences'
import type { PrivateSessionService } from '@/lib/private-session-services'
import ServiceEditor from './service-editor'

type SessionRequest = {
  id: string
  full_name: string
  phone: string
  email: string | null
  message: string | null
  session_type: string
  created_at: string
  status: string
  preferred_slots: string[]
}

function contactNumbers(phone: string) {
  const normalized = phone.replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
  const digits = normalized.replace(/\D/g, '')
  const international = normalized.trim().startsWith('+')
    ? digits
    : digits.startsWith('00')
      ? digits.slice(2)
      : /^05\d{8}$/.test(digits)
        ? `972${digits.slice(1)}`
        : /^(972|970)\d{8,9}$/.test(digits) ? digits : null
  return { dial: normalized.trim().startsWith('+') ? `+${digits}` : digits, international }
}

const tabStyle = 'inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#617A55]'

export default async function AdminRequestsPage({ searchParams }: { searchParams: Promise<{ item?: string; status?: string; tab?: string }> }) {
  const { item: selectedId, status, tab } = await searchParams
  const manageServices = tab === 'services'
  const supabase = await getAdminSession()
  const tabs = (
    <nav aria-label="أقسام الجلسات الفردية" className="mt-4 flex flex-wrap gap-2">
      <Link href="/admin/requests" aria-current={!manageServices ? 'page' : undefined} className={`${tabStyle} ${!manageServices ? 'bg-[#617A55] text-white' : 'bg-[#D6E2B6]/40 text-[#465d3d]'}`}>طلبات الحجز</Link>
      <Link href="/admin/requests?tab=services" aria-current={manageServices ? 'page' : undefined} className={`${tabStyle} ${manageServices ? 'bg-[#617A55] text-white' : 'bg-[#D6E2B6]/40 text-[#465d3d]'}`}>إدارة الجلسات</Link>
    </nav>
  )
  const heading = (
    <header className="border-b border-[#617A55]/15 pb-5">
      <h1 className="font-serif text-3xl text-[#617A55] sm:text-4xl">الجلسات الفردية</h1>
      {tabs}
    </header>
  )

  if (manageServices) {
    const { data, error } = await supabase
      .from('private_session_services')
      .select('*')
      .order('id')
      .returns<PrivateSessionService[]>()

    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {heading}
        {error ? (
          <p role="alert" className="mt-6 rounded-lg bg-[#C7D6E8]/50 p-5 text-[#465d3d]">تعذّر تحميل الجلسات. حاولي مرة أخرى.</p>
        ) : <ServiceEditor services={data ?? []} />}
      </main>
    )
  }

  const onlyPending = status === 'pending'
  // getAdminNotificationCounts() is independent of the session_requests
  // query - run them together instead of waiting on the counts first.
  const [{ available }, { data, error }] = await Promise.all([
    getAdminNotificationCounts(),
    supabase
      .from('session_requests')
      .select('id, full_name, phone, email, message, session_type, created_at, status, preferred_slots')
      .order('created_at', { ascending: false })
      .match({ ...(selectedId ? { id: selectedId } : {}), ...(onlyPending ? { status: 'pending' } : {}) })
      .returns<SessionRequest[]>(),
  ])

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {heading}
      {(selectedId || onlyPending) && <Link href="/admin/requests" className="mt-4 inline-flex min-h-11 items-center text-sm text-[#617A55] underline underline-offset-4">عرض القائمة كاملة</Link>}
      {error && <p role="alert" className="mt-6 rounded-lg bg-[#C7D6E8]/50 p-5 text-[#617A55]">تعذر تحميل طلبات الجلسات. تحققي من الاتصال وصلاحيات عرض الطلبات.</p>}
      {!error && !data?.length && <p className="mt-6 bg-[#D6E2B6]/40 p-6 text-[#617A55]">{onlyPending ? 'كل شي تمام، لا توجد طلبات جديدة.' : 'لا توجد طلبات جلسات بعد.'}</p>}
      {!error && data && (
        <div className="mt-6 grid gap-4">
          {data.map((request) => {
            const phone = contactNumbers(request.phone)
            const preferredTimes = (request.preferred_slots ?? []).flatMap((slot) => {
              const label = formatPreferredSlot(slot, 'ar')
              return label ? [{ slot, label }] : []
            })
            return (
              <NotificationItem key={`${request.id}-${selectedId === request.id}`} kind="session_request" id={request.id} title={request.full_name} preview={request.session_type} status={({ pending: 'جديد', contacted: 'تم التواصل', scheduled: 'تم تحديد موعد', closed: 'مغلق' } as Record<string, string>)[request.status] ?? request.status} initiallyOpen={selectedId === request.id} enabled={available}>
              <article className="min-w-0 rounded-lg border border-[#617A55]/15 bg-white p-5 sm:p-6">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
                  <div className="min-w-0">
                    <h2 className="break-words text-xl font-semibold text-[#617A55]">{request.full_name}</h2>
                    <p className="mt-2 break-words text-sm font-medium text-[#617A55]">{request.session_type}</p>
                    <time dateTime={request.created_at} className="mt-2 block text-sm text-[#617A55]/75">
                      {new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jerusalem' }).format(new Date(request.created_at))}
                    </time>
                    <dl className="mt-4 grid gap-3 text-sm text-[#617A55] sm:grid-cols-2">
                      <div className="min-w-0">
                        <dt className="mb-1 text-xs font-semibold">الهاتف</dt>
                        <dd className="flex flex-wrap items-center gap-x-4 gap-y-2">
                          {phone.dial ? <a href={`tel:${phone.dial}`} dir="ltr" className="break-all underline underline-offset-4">{request.phone}</a> : '-'}
                          {phone.international && <a href={`https://wa.me/${phone.international}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-lg bg-[#D6E2B6]/60 px-3">WhatsApp</a>}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="mb-1 text-xs font-semibold">البريد الإلكتروني</dt>
                        <dd>{request.email ? <a href={`mailto:${request.email}`} dir="ltr" className="inline-block max-w-full break-all underline underline-offset-4">{request.email}</a> : '-'}</dd>
                      </div>
                    </dl>
                    {preferredTimes.length > 0 && (
                      <div className="mt-4 rounded-lg bg-[#EAF1F8] p-4 text-sm text-[#25311f]">
                        <h3 className="font-semibold">المواعيد المقترحة بتوقيت القدس</h3>
                        <ul className="mt-2 grid gap-1">
                          {preferredTimes.map(({ slot, label }, index) => (
                            <li key={`${slot}-${index}`}><time dateTime={slot}>{label}</time></li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {request.message && <div className="mt-4 border-t border-[#617A55]/15 pt-4"><h3 className="text-xs font-semibold text-[#617A55]">الرسالة</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-[#617A55]">{request.message}</p></div>}
                  </div>
                  <div className="flex flex-col items-start gap-3"><RequestStatusSelect id={request.id} status={request.status} /><AdminDeleteButton kind="request" id={request.id} label={`طلب جلسة / ${request.full_name}`} /></div>
                </div>
              </article>
              </NotificationItem>
            )
          })}
        </div>
      )}
    </main>
  )
}

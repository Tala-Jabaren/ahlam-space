import { getAdminSession } from '@/components/admin/admin-session'
import RequestStatusSelect from '@/components/admin/request-status-select'

type SessionRequest = {
  id: string
  full_name: string
  phone: string
  email: string | null
  message: string | null
  session_type: string
  created_at: string
  status: string
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

export default async function AdminRequestsPage() {
  const supabase = await getAdminSession()
  const { data, error } = await supabase
    .from('session_requests')
    .select('id, full_name, phone, email, message, session_type, created_at, status')
    .order('created_at', { ascending: false })
    .returns<SessionRequest[]>()

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="border-b border-[#617A55]/15 pb-6">
        <h1 className="font-serif text-3xl text-[#617A55] sm:text-4xl">طلبات الجلسات الفردية</h1>
        <p className="mt-3 leading-7 text-[#617A55]">متابعة الطلبات والتواصل مع العميلات وتحديث الحالة.</p>
      </header>
      {error && <p role="alert" className="mt-6 rounded-lg bg-[#C7D6E8]/50 p-5 text-[#617A55]">تعذر تحميل طلبات الجلسات. تحققي من الاتصال وصلاحيات عرض الطلبات.</p>}
      {!error && !data?.length && <p className="mt-6 bg-[#D6E2B6]/40 p-6 text-[#617A55]">لا توجد طلبات جلسات بعد.</p>}
      {!error && data && (
        <div className="mt-6 grid gap-4">
          {data.map((request) => {
            const phone = contactNumbers(request.phone)
            return (
              <article key={request.id} className="min-w-0 rounded-lg border border-[#617A55]/15 bg-white p-5 sm:p-6">
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
                    {request.message && <div className="mt-4 border-t border-[#617A55]/15 pt-4"><h3 className="text-xs font-semibold text-[#617A55]">الرسالة</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-[#617A55]">{request.message}</p></div>}
                  </div>
                  <RequestStatusSelect id={request.id} status={request.status} />
                </div>
              </article>
            )
          })}
        </div>
      )}
    </main>
  )
}

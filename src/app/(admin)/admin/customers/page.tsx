import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Download, Search, Users } from 'lucide-react'
import { getAdminSession } from '@/components/admin/admin-session'
import { getCustomers, getGuestBuyers, type RegisteredCustomerAccount, type GuestBuyerRow, type CustomerTab, type CustomerSort } from '@/lib/admin-customers'
import CustomerAccountControls from './_account-controls'

const numbers = new Intl.NumberFormat('ar')
const money = new Intl.NumberFormat('ar', { style: 'currency', currency: 'ILS' })
const dates = new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeZone: 'Asia/Jerusalem' })
const control = 'min-h-11 rounded-lg border border-[#617A55]/25 bg-white px-3 py-2 text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55]'
const action = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#617A55]/25 px-4 py-2 text-sm text-[#617A55] transition-colors hover:bg-[#D6E2B6]/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55]'

function formatDate(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : dates.format(date)
}

function customerView(row: RegisteredCustomerAccount | GuestBuyerRow, index: number, tab: CustomerTab, q: string, sort: CustomerSort, page: number) {
  const registered = 'user_id' in row
  const values = registered
    ? [row.full_name, row.email, row.phone, row.city, formatDate(row.registered_at), numbers.format(row.orders_count), money.format(row.total_spent), formatDate(row.last_order_at)]
    : [row.guest_name, row.guest_phone, row.guest_email, numbers.format(row.orders_count), money.format(row.total_spent), formatDate(row.last_order_at)]
  const filters = new URLSearchParams({ tab, q, sort, page: String(page) })
  if (!registered && row.guest_phone) filters.set('phone', row.guest_phone)
  const detailHref = registered ? `/admin/customers/${encodeURIComponent(row.user_id)}?${filters}` : row.guest_phone ? `/admin/customers/guest?${filters}` : null
  return { key: registered ? row.user_id : `${row.guest_phone}-${index}`, registered, values, detailHref }
}

export default async function CustomersPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const supabase = await getAdminSession()
  const params = await searchParams
  const tab: CustomerTab = params.tab === 'guests' ? 'guests' : 'users'
  const sort: CustomerSort = params.sort === 'registered_asc' || params.sort === 'spent_desc' ? params.sort : 'registered_desc'
  const q = typeof params.q === 'string' ? params.q.trim().slice(0, 200) : ''
  const parsedPage = typeof params.page === 'string' ? Number(params.page) : 1
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1
  const pageSize = 20
  const query = { tab, q, sort, page, pageSize }
  const href = (changes: Record<string, string> = {}) => `/admin/customers?${new URLSearchParams({ tab, q, sort, page: String(page), ...changes })}`
  let rows: (RegisteredCustomerAccount | GuestBuyerRow)[] = []
  let total = 0
  let failed = false
  try {
    const result = tab === 'guests' ? await getGuestBuyers(supabase, query) : await getCustomers(supabase, query)
    rows = result.rows
    total = result.total
  } catch {
    failed = true
  }
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (!failed && page > pages) redirect(href({ page: String(pages) }))
  const columns = tab === 'users'
    ? ['الاسم', 'البريد الإلكتروني', 'رقم الهاتف', 'المدينة', 'تاريخ التسجيل', 'عدد الطلبات', 'إجمالي المشتريات', 'آخر طلب']
    : ['الاسم', 'رقم الهاتف', 'البريد الإلكتروني', 'عدد الطلبات', 'إجمالي المشتريات', 'آخر طلب']

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-[#617A55]/15 pb-7">
        <div>
          <h1 className="text-3xl font-medium text-[#617A55]">الزبائن</h1>
          <p className="mt-2 text-sm text-[#617A55]">المسجّلون وزبائن المتجر بدون حساب</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['docx', 'csv'] as const).map((format) => (
            <a key={format} download className={action} href={`/admin/customers/export?${new URLSearchParams({ format, tab, q, sort })}`}>
              <Download size={16} aria-hidden="true" />تحميل {format === 'docx' ? 'Word' : 'CSV'}
            </a>
          ))}
        </div>
      </header>

      <nav aria-label="نوع الزبائن" className="mt-6 flex flex-wrap gap-2">
        {([['users', 'المسجّلون'], ['guests', 'زبائن بدون حساب']] as const).map(([value, label]) => (
          <Link key={value} href={href({ tab: value, page: '1' })} aria-current={tab === value ? 'page' : undefined}
            className={`${action} ${tab === value ? 'border-transparent bg-[#D6E2B6] font-semibold' : 'bg-transparent'}`}>{label}</Link>
        ))}
      </nav>

      <form action="/admin/customers" method="get" className="my-6 grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <input type="hidden" name="tab" value={tab} />
        <label className="grid gap-2 text-sm">البحث بالاسم أو البريد أو الهاتف
          <input key={`${tab}-${q}`} name="q" type="search" maxLength={200} defaultValue={q} placeholder="ابحثي عن زبون..." className={`${control} w-full min-w-0`} />
        </label>
        <label className="grid gap-2 text-sm">الترتيب
          <select key={sort} name="sort" defaultValue={sort} className={control}>
            <option value="registered_desc">الأحدث أولاً</option>
            <option value="registered_asc">الأقدم أولاً</option>
            <option value="spent_desc">الأعلى إنفاقاً</option>
          </select>
        </label>
        <button type="submit" className={`${action} bg-[#617A55] text-white hover:bg-[#617A55]/90`}><Search size={16} aria-hidden="true" />بحث</button>
      </form>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p aria-live="polite">الإجمالي: <strong>{failed ? '-' : numbers.format(total)}</strong></p>
        {q && <Link href={href({ q: '', page: '1' })} className="text-[#617A55] underline underline-offset-4">مسح البحث</Link>}
      </div>

      {failed ? (
        <div role="alert" className="rounded-lg bg-[#C7D6E8]/40 p-6">
          تعذّر تحميل الزبائن. حاولي مرة أخرى.
          <Link href={href()} className="ms-3 underline">إعادة المحاولة</Link>
        </div>
      ) : rows.length === 0 ? (
        <div className="border-y border-[#617A55]/15 py-16 text-center">
          <Users className="mx-auto mb-4 text-[#617A55]" size={30} aria-hidden="true" />
          <p>{q ? 'لا توجد نتائج مطابقة للبحث.' : 'لا يوجد زبائن بعد.'}</p>
        </div>
      ) : (
        <>
        <ul aria-label="بطاقات الزبائن" className="grid gap-4 lg:hidden">
          {rows.map((row, index) => {
            const view = customerView(row, index, tab, q, sort, page)
            return <li key={view.key} className="min-w-0 rounded-xl border border-[#617A55]/15 bg-white p-4">
              <div className="flex items-start justify-between gap-3"><h2 className="min-w-0 break-words text-lg font-semibold text-[#617A55]">{view.values[0] || 'بدون اسم'}</h2><span className={`shrink-0 rounded-full px-3 py-1 text-xs ${view.registered ? 'bg-[#D6E2B6]/60' : 'bg-[#C7D6E8]/50'}`}>{view.registered ? 'حساب مسجّل' : 'بدون حساب'}</span></div>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">{view.values.slice(1).map((value, i) => <div key={i} className="min-w-0"><dt className="text-xs text-[#617A55]/80">{columns[i + 1]}</dt><dd className="mt-1 break-words text-sm"><bdi className="break-all">{value || '-'}</bdi></dd></div>)}</dl>
              {view.detailHref ? <Link href={view.detailHref} className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#617A55] px-4 py-2 text-base font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55]">عرض التفاصيل</Link> : <p className="mt-4 text-sm text-[#617A55]">رقم الهاتف غير متاح لفتح التفاصيل.</p>}
              {'user_id' in row && (
                <div className="mt-4 border-t border-[#617A55]/15 pt-4">
                  <CustomerAccountControls userId={row.user_id} name={row.full_name || row.email || 'هذا الزبون'} disabled={row.account_disabled} />
                </div>
              )}
            </li>
          })}
        </ul>
        <div tabIndex={0} role="region" aria-label="قائمة الزبائن" className="hidden overflow-x-auto lg:block rounded-lg border border-[#617A55]/15 bg-white focus-visible:outline-2 focus-visible:outline-[#617A55]">
          <table className={`w-full text-start text-sm ${tab === 'users' ? 'min-w-[1200px]' : 'min-w-[800px]'}`}>
            <caption className="sr-only">{tab === 'users' ? 'المسجّلون' : 'زبائن بدون حساب'}</caption>
            <thead className="border-b border-[#617A55]/15 bg-[#D6E2B6]/30 text-[#617A55]">
              <tr>
                {columns.map((column) => <th scope="col" key={column} className="whitespace-nowrap px-4 py-4 text-start font-medium">{column}</th>)}
                {tab === 'users' && <th scope="col" className="whitespace-nowrap px-4 py-4 text-start font-medium">إدارة الحساب</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#617A55]/10">
              {rows.map((row, index) => {
                const { values, detailHref } = customerView(row, index, tab, q, sort, page)
                return <tr key={'user_id' in row ? row.user_id : `${row.guest_phone}-${index}`} className="hover:bg-[#F7F6F0]">
                  {values.map((value, cell) => <td key={cell} className="px-4 py-4">{cell === 0 && detailHref
                    ? <Link href={detailHref} className="inline-block min-h-11 content-center rounded text-[#617A55] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55]"><bdi className="break-words">{value || 'بدون اسم'}</bdi></Link>
                    : <bdi className="break-words">{value || '-'}</bdi>}</td>)}
                  {'user_id' in row && (
                    <td className="min-w-46 px-4 py-4">
                      <CustomerAccountControls userId={row.user_id} name={row.full_name || row.email || 'هذا الزبون'} disabled={row.account_disabled} />
                    </td>
                  )}
                </tr>
              })}
            </tbody>
          </table>
        </div>
        </>
      )}

      {!failed && total > 0 && <nav aria-label="صفحات الزبائن" className="mt-5 flex flex-wrap items-center justify-between gap-3">
        {page > 1 ? <Link className={action} href={href({ page: String(page - 1) })}>السابق</Link> : <span aria-disabled="true" className={`${action} opacity-40`}>السابق</span>}
        <p className="text-sm">الصفحة {numbers.format(page)} من {numbers.format(pages)}</p>
        {page < pages ? <Link className={action} href={href({ page: String(page + 1) })}>التالي</Link> : <span aria-disabled="true" className={`${action} opacity-40`}>التالي</span>}
      </nav>}
    </main>
  )
}

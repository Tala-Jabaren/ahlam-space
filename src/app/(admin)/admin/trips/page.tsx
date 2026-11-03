import Link from 'next/link'
import TripDeleteButton from '@/components/admin/trip-delete-button'
import TripEditor from '@/components/admin/trip-editor'
import { getAdminSession } from '@/components/admin/admin-session'
import { tripStatusLabels, type TripRow } from '@/lib/trips'

export default async function AdminTripsPage() {
  const supabase = await getAdminSession()
  const { data, error } = await supabase
    .from('trips')
    .select('id, title, description, location, starts_on, ends_on, application_deadline, capacity, cover_image_url, status, created_at')
    .order('starts_on', { ascending: false })
    .returns<TripRow[]>()

  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <h1 className="border-b border-[#617A55]/15 pb-6 font-serif text-3xl text-[#617A55]">المشاوير</h1>

    <div className="mt-6"><TripEditor /></div>

    {error ? (
      <p role="alert" className="mt-6 rounded-lg bg-[#C7D6E8]/50 p-5">تعذر تحميل المشاوير. تحققي من صلاحيات العرض والاتصال.</p>
    ) : !data?.length ? (
      <p className="mt-6 p-5">لا توجد مشاوير بعد.</p>
    ) : (
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {data.map((trip) => (
          <article key={trip.id} className="min-w-0 rounded-lg border border-[#617A55]/15 bg-white p-5">
            <header className="flex items-start justify-between gap-3">
              <h2 className="min-w-0 break-words text-xl font-semibold text-[#617A55]">{trip.title}</h2>
              <TripDeleteButton rpc="admin_delete_trip" id={trip.id} label={trip.title} />
            </header>
            <p className="my-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-[#617A55]">{trip.location}</span>
              <span className="inline-flex items-center rounded-full bg-[#D6E2B6]/70 px-2.5 py-0.5 text-xs font-semibold text-[#3f5233]">{tripStatusLabels[trip.status]}</span>
            </p>
            <p className="text-sm text-[#617A55]/80">
              <bdi>{new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${trip.starts_on}T00:00:00Z`))} - {new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${trip.ends_on}T00:00:00Z`))}</bdi>
            </p>
            {trip.application_deadline && (
              <p className="mt-1 text-sm text-[#617A55]/80">آخر موعد للتسجيل: <bdi>{new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${trip.application_deadline}T00:00:00Z`))}</bdi></p>
            )}
            {trip.capacity !== null && <p className="mt-1 text-sm text-[#617A55]/80">السعة: <bdi>{trip.capacity}</bdi></p>}
            <p className="mb-4 mt-2 whitespace-pre-wrap break-words text-sm leading-7">{trip.description}</p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/admin/trips/${trip.id}`}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#617A55]/30 px-4 text-sm font-semibold text-[#617A55] transition hover:bg-[#D6E2B6]/40"
              >
                الصور والطلبات
              </Link>
            </div>
            <div className="mt-4"><TripEditor record={trip} /></div>
          </article>
        ))}
      </div>
    )}
  </main>
}

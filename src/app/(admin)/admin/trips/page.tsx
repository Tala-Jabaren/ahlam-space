import PendingTripRequests from '@/components/admin/home/pending-trip-requests'
import { redirect } from 'next/navigation'
import { resolveTripNotification } from '@/components/admin/notifications/notification-data'
import Link from 'next/link'
import { Images } from 'lucide-react'
import TripDeleteButton from '@/components/admin/trip-delete-button'
import TripEditor from '@/components/admin/trip-editor'
import TripPhotoManager from '@/components/admin/trip-photo-manager'
import { getAdminSession } from '@/components/admin/admin-session'
import { TRIP_COLUMNS, tripStatusLabels, type TripGalleryPhoto, type TripRow } from '@/lib/trips'

const tabStyle = 'inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#617A55]'

export default async function AdminTripsPage({ searchParams }: { searchParams: Promise<{ item?: string; review?: string; tab?: string }> }) {
  const { item, review, tab } = await searchParams
  const photosTab = tab === 'photos'
  if (item) {
    const tripId = await resolveTripNotification(item)
    if (tripId) redirect(`/admin/trips/${encodeURIComponent(tripId)}?item=${encodeURIComponent(item)}`)
  }
  if (review === 'pending' && !item) return <PendingTripRequests />
  const supabase = await getAdminSession()
  const trips = photosTab ? null : await supabase
    .from('trips')
    .select(TRIP_COLUMNS)
    .order('starts_on', { ascending: false })
    .returns<TripRow[]>()
  const gallery = photosTab ? await supabase
    .from('trip_gallery_photos')
    .select('id, photo_url, caption, display_order, is_published')
    .order('display_order')
    .order('id')
    .returns<TripGalleryPhoto[]>() : null

  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <header className="border-b border-[#617A55]/15 pb-5">
      <h1 className="font-serif text-3xl text-[#617A55]">المشاوير</h1>
      <nav aria-label="أقسام المشاوير" className="mt-4 flex flex-wrap gap-2">
        <Link href="/admin/trips" aria-current={!photosTab ? 'page' : undefined} className={`${tabStyle} ${!photosTab ? 'bg-[#617A55] text-white' : 'bg-[#D6E2B6]/40 text-[#465d3d]'}`}>قائمة المشاوير</Link>
        <Link href="/admin/trips?tab=photos" aria-current={photosTab ? 'page' : undefined} className={`${tabStyle} ${photosTab ? 'bg-[#617A55] text-white' : 'bg-[#D6E2B6]/40 text-[#465d3d]'}`}><Images aria-hidden="true" size={17} /> إدارة الصور</Link>
      </nav>
    </header>

    {item && <p role="status" className="mt-5 rounded-lg bg-[#C7D6E8]/40 p-4 text-sm">لم نتمكن من فتح هذا الطلب. قد يكون محذوفًا أو غير متاح حاليًا.</p>}
    {!photosTab && <div className="mt-6"><TripEditor /></div>}

    {gallery ? (
      gallery.error ? <p role="alert" className="mt-6 rounded-lg bg-[#C7D6E8]/50 p-5">تعذر تحميل معرض الصور.</p> : <TripPhotoManager photos={gallery.data ?? []} />
    ) : trips?.error ? (
      <p role="alert" className="mt-6 rounded-lg bg-[#C7D6E8]/50 p-5">تعذر تحميل المشاوير. تحققي من صلاحيات العرض والاتصال.</p>
    ) : !trips?.data?.length ? (
      <p className="mt-6 p-5">لا توجد مشاوير بعد.</p>
    ) : (
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {trips.data.map((trip) => (
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
                طلبات المشاركة
              </Link>
            </div>
            <div className="mt-4"><TripEditor record={trip} /></div>
          </article>
        ))}
      </div>
    )}
  </main>
}

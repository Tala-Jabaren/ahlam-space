import { getAdminNotificationCounts } from '@/components/admin/notifications/notification-data'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAdminSession } from '@/components/admin/admin-session'
import TripApplicationsList from '@/components/admin/trip-applications-list'
import { TRIP_COLUMNS, getTripApplications, tripStatusLabels, type TripRow } from '@/lib/trips'
import TripMessageForm from '@/components/admin/trip-message-form'

export default async function AdminTripDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>
  searchParams: Promise<{ item?: string }>
}) {
  const { tripId } = await params
  const { item: selectedId } = await searchParams
  const { available } = await getAdminNotificationCounts()
  const supabase = await getAdminSession()

  const { data: trip } = await supabase
    .from('trips')
    .select(TRIP_COLUMNS)
    .eq('id', tripId)
    .maybeSingle()
    .returns<TripRow>()

  if (!trip) notFound()

  let applications: Awaited<ReturnType<typeof getTripApplications>> = []
  let applicationsError = false
  try {
    applications = await getTripApplications(supabase, tripId)
  } catch {
    // Never log the error object itself here - it could, in principle,
    // echo back query parameters. A generic failure banner is enough; the
    // admin can retry by refreshing.
    applicationsError = true
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/admin/trips" className="mb-4 inline-block text-sm text-[#617A55] underline-offset-4 hover:underline">
        ← العودة إلى المشاوير
      </Link>

      <header className="border-b border-[#617A55]/15 pb-6">
        <h1 className="font-serif text-3xl text-[#617A55]">{trip.title}</h1>
        <p className="mt-2 text-sm text-[#617A55]/80">{trip.location} · {tripStatusLabels[trip.status]}</p>
      </header>

      {applicationsError ? (
        <p role="alert" className="mt-10 rounded-lg bg-[#C7D6E8]/50 p-5">تعذر تحميل طلبات المشاركة. تحققي من صلاحيات العرض والاتصال.</p>
      ) : (
        <>
          <TripMessageForm
            tripId={trip.id}
            approvedCount={applications.filter((application) => application.status === 'approved').length}
          />
          <TripApplicationsList applications={applications} selectedId={selectedId} notificationsAvailable={available} />
        </>
      )}
    </main>
  )
}

import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ApplicationForm from '@/components/trips/application-form'
import { formatTripDate } from '@/components/trips/trip-card'
import TripImageCarousel from '@/components/trips/trip-image-carousel'
import { TRIP_COLUMNS, getTripSlideImages, isTripAcceptingApplications, type TripRow } from '@/lib/trips'

export default async function TripApplyPage({
  params,
}: {
  params: Promise<{ tripId: string }>
}) {
  const { tripId } = await params
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (!user) {
    if (userError) console.error('supabase.auth.getUser() failed:', userError.message)
    redirect(`/login?returnTo=${encodeURIComponent(`/trips/${tripId}/apply`)}`)
  }

  const { data: trip } = await supabase
    .from('trips')
    .select(TRIP_COLUMNS)
    .eq('id', tripId)
    .maybeSingle()
    .returns<TripRow>()

  if (!trip) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone')
    .eq('id', user.id)
    .maybeSingle()

  // Only the columns a member can actually select directly from
  // trip_applications (see the column-level grant in supabase/trips.sql) -
  // id/trip_id/status is all that's needed to decide whether to show the
  // "already applied" notice instead of the form.
  const { data: existingApplication } = await supabase
    .from('trip_applications')
    .select('id, trip_id, status')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .maybeSingle()

  const alreadyApplied = Boolean(existingApplication && existingApplication.status !== 'withdrawn')
  const accepting = isTripAcceptingApplications(trip)
  const tripImages = await getTripSlideImages(supabase, trip)

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label="مسار التنقل" className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-[#617A55]/80">
        <Link href="/trips" className="underline-offset-4 hover:underline">المشاوير</Link>
        <span aria-hidden="true">‹</span>
        <span className="text-[#25311f]">استمارة المشاركة</span>
      </nav>

      <h1 className="font-serif text-3xl text-[#617A55] sm:text-4xl">استمارة المشاركة</h1>
      <p className="mt-2 text-sm text-[#617A55]/80">
        {trip.title} · <bdi>{formatTripDate(trip.starts_on)}</bdi>
      </p>
      <TripImageCarousel images={tripImages} title={trip.title} className="mt-6 aspect-[16/10] w-full rounded-2xl sm:aspect-[2/1]" />

      {alreadyApplied ? (
        <div className="mt-8 rounded-lg bg-[#D6E2B6]/40 p-5 text-sm">
          <p>قدّمتِ طلب مشاركة بهذا المشوار بالفعل.</p>
          <Link href="/trips" className="mt-2 inline-block font-semibold text-[#617A55] underline-offset-4 hover:underline">
            العودة إلى المشاوير
          </Link>
        </div>
      ) : !accepting ? (
        <p role="alert" className="mt-8 rounded-lg bg-[#C7D6E8]/50 p-5 text-sm">
          التسجيل في هذا المشوار غير متاح حاليًا.
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm leading-7 text-[#4f5d49]">
            لتسجيل في هذا المشوار نحتاج منك الإجابة عن هذه الأسئلة. إرسال الاستمارة طلب مشاركة وليس تأكيدًا للحجز، وستراجع أحلام طلبك وتتواصل معك.
          </p>

          <ApplicationForm
            tripId={trip.id}
            defaultName={profile?.full_name ?? ''}
            defaultPhone={profile?.phone ?? ''}
            defaultEmail={user.email ?? ''}
          />
        </>
      )}
    </main>
  )
}

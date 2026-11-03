import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ApplicationForm from '@/components/trips/application-form'
import { formatTripDate } from '@/components/trips/trip-card'
import type { TripRow } from '@/lib/trips'

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
    .select('id, title, description, location, starts_on, ends_on, application_deadline, capacity, cover_image_url, status, created_at')
    .eq('id', tripId)
    .maybeSingle()
    .returns<TripRow>()

  if (!trip) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone')
    .eq('id', user.id)
    .maybeSingle()

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

      {trip.status !== 'open' ? (
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

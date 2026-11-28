import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getT } from '@/i18n/get-t'
import { getLocale } from '@/i18n/get-locale'
import { getDictionary } from '@/i18n/dictionaries'
import { pageMetadata } from '@/lib/seo'
import { getSafeReturnTo } from '@/lib/safe-return-to'
import { loginHref } from '@/lib/login-redirect'
import JourneysContent from '@/components/trips/journeys-content'
import { getOpenTrip, getPublishedTripPhotos, getTripSlideImages, isTripAcceptingApplications } from '@/lib/trips'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = getDictionary(locale)
  // Requires an account now (see the redirect below) - nothing a crawler
  // without one could actually reach here, same reasoning as course pages.
  return { ...pageMetadata({ ...t.seo.journeys, path: '/journeys', locale }), robots: { index: false, follow: false } }
}

// Requires an account - guests are sent to log in first, then land back
// here via returnTo. Never queries trip_applications or anything else
// that could expose a participant's name - getPublishedTripPhotos only
// reads published gallery photos; getOpenTrip reads non-draft trips and
// the trips table's own public columns. Rendering itself lives in
// JourneysContent (pure presentational, data passed in) so it can also be
// exercised with fabricated data without touching Supabase.
export default async function JourneysPage() {
  const supabase = await createClient()
  const { t, locale, dir } = await getT()
  const copy = t.journeys

  const [
    {
      data: { user },
    },
    { trip: openTrip, error: openTripError },
    { photos, error: photosError },
  ] = await Promise.all([
    supabase.auth.getUser(),
    getOpenTrip(supabase),
    getPublishedTripPhotos(supabase),
  ])

  if (!user) redirect(loginHref('/journeys'))

  if (openTripError) console.error('Failed to load the open trip for /journeys.')
  if (photosError) console.error('Failed to load trip photos for /journeys.')

  const accepting = openTrip ? isTripAcceptingApplications(openTrip) : false
  const tripImages = openTrip ? await getTripSlideImages(supabase, openTrip) : []
  // openTrip.id is our own database uuid, never user input, so this is
  // already a safe path by construction - still run through the shared
  // sanitizer as the single source of truth for "what's a safe returnTo",
  // same as login/sign-up, rather than trusting that by inspection alone.
  const applyPath = openTrip ? (getSafeReturnTo(`/trips/${openTrip.id}/apply`) ?? '/trips') : '/trips'

  return (
    <JourneysContent
      copy={copy}
      dir={dir}
      locale={locale}
      isAuthenticated={Boolean(user)}
      openTrip={openTrip}
      accepting={accepting}
      applyPath={applyPath}
      photos={photos}
      tripImages={tripImages}
    />
  )
}

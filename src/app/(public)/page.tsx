import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getT } from '@/i18n/get-t'
import { getLocale } from '@/i18n/get-locale'
import { getDictionary } from '@/i18n/dictionaries'
import { pageMetadata } from '@/lib/seo'
import HeroSection from '@/components/home/hero-section'
import ArcGallerySection from '@/components/home/arc-gallery-section'
import ServicesSection from '@/components/home/services-section'
import ReviewsSection from '@/components/home/reviews-section'
import type { ReviewRow } from '@/lib/reviews'
import WeeklySessionsSection, { type UpcomingSession } from '@/components/home/weekly-sessions-section'
import { getPublishedTripPhotos } from '@/lib/trips'
import { siteStats } from '@/content/site-stats'
import { homeGalleryPhotos } from '@/content/home-gallery'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = getDictionary(locale)
  return pageMetadata({ ...t.seo.home, path: '/', locale })
}

const serviceHrefs = ['/private-sessions', '/courses', '/classes', '/shop'] as const

function isUpcoming(session: UpcomingSession) {
  return session.status === 'scheduled' && new Date(`${session.session_date}T${session.end_time}`) > new Date()
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ previewReviews?: string }>
}) {
  const resolvedSearchParams = await searchParams
  // NODE_ENV is 'production' for every Vercel deployment, Production and
  // Preview alike - only `next dev` is 'development' (same convention
  // already used in src/lib/bank-details.ts) - so this query flag can never
  // do anything on a real deployment, only under a local dev server.
  const previewAllReviews =
    process.env.NODE_ENV === 'development' && resolvedSearchParams?.previewReviews === '1'

  const supabase = await createClient()
  const { t, locale, dir } = await getT()

  // Filtered at the query itself, server-side, before anything crosses into
  // the ReviewsSection client component's props - a Client Component's
  // props are serialized into the page's RSC payload regardless of what it
  // renders, so an unapproved review must never be fetched in the first
  // place outside of the dev-only preview, not merely hidden by the
  // component's own render logic. RLS backs this up independently (the
  // public policy on public.reviews only ever returns approved = true rows
  // to begin with), so this holds even if the .eq() below were ever
  // dropped by mistake.
  let reviewsQuery = supabase
    .from('reviews')
    .select('id, display_order, name, body, lang, approved, sensitive, photo_url, created_at')
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
  if (!previewAllReviews) reviewsQuery = reviewsQuery.eq('approved', true)

  const [
    {
      data: { user },
    },
    { data: sessions, error: sessionsError },
    { data: reviewRows, error: reviewsError },
    { photos: visibleTripPhotos, error: tripPhotosError },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('class_sessions')
      .select(
        'id, session_date, start_time, end_time, capacity, booked_count, status, location, classes(name, duration_minutes, price)'
      )
      .order('session_date', { ascending: true })
      .order('start_time', { ascending: true })
      .returns<UpcomingSession[]>(),
    reviewsQuery.returns<ReviewRow[]>(),
    getPublishedTripPhotos(supabase),
  ])

  if (sessionsError) {
    console.error('Failed to load upcoming home sessions:', sessionsError.message)
  }
  if (reviewsError) {
    console.error('Failed to load home page reviews:', reviewsError.message)
  }
  if (tripPhotosError) {
    console.error('Failed to load trip photos.')
  }
  const visibleReviews = reviewRows ?? []
  const upcomingSessions = (sessions ?? []).filter(isUpcoming).slice(0, 3)
  const services = t.home.services.map((service, index) => ({ ...service, href: serviceHrefs[index] }))

  // home-gallery.ts is the curated source; only published photos of
  // non-draft trips (never anything unapproved) back-fill it when it's
  // empty. ArcGallerySection itself hides the photo arc below 3 photos.
  const galleryPhotos =
    homeGalleryPhotos.length > 0
      ? homeGalleryPhotos
      : visibleTripPhotos.map((photo) => ({
          src: photo.photo_url,
          alt: photo.caption ?? t.home.trips.photoAlt,
        }))

  return (
    <div className="overflow-x-clip bg-[#F6F5EE] text-[#34472B]" dir={dir}>
      <HeroSection copy={t.home} dir={dir} isAuthenticated={Boolean(user)} />

      <ArcGallerySection photos={galleryPhotos} stats={siteStats} header={t.home.statsHeader} />

      <ServicesSection services={services} header={t.home.servicesHeader} />
      <ReviewsSection reviews={visibleReviews} />

      <WeeklySessionsSection
        copy={t.home}
        minutesSuffix={t.common.minutesSuffix}
        locale={locale}
        sessions={upcomingSessions}
        sessionsError={Boolean(sessionsError)}
        isAuthenticated={Boolean(user)}
      />
    </div>
  )
}

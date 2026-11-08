import Link from 'next/link'
import TripPhotoStrip, { type TripPhoto } from '@/components/trips/trip-photo-strip'
import TripCard from '@/components/trips/trip-card'
import { isTripAcceptingApplications, type TripRow } from '@/lib/trips'
import WordRevealText from './word-reveal-text'

type TripsLabels = {
  eyebrow: string
  heading: string
  subtitle: string
  photoAlt: string
  viewAllLabel: string
  registrationOpenBadge: string
  applicationsClosedBadge: string
  deadlineLabel: string
  dateLabel: string
  locationLabel: string
  applyNote: string
  loginToApply: string
  createAccount: string
  membersOnlyNote: string
  applyButton: string
}

// Renders nothing at all - no eyebrow, no heading, no strip - when there's
// neither a published photo nor an open trip to show, same "hide the whole
// section" rule the reviews section follows for an empty approved list.
// The caller is expected to have already dropped a trip whose ends_on has
// passed (hide the card entirely in that case) - this component only
// decides between "accepting applications" and "deadline passed but trip
// hasn't ended yet", via isTripAcceptingApplications. Styling only (palette/
// spacing) was updated for the home redesign - the data/visibility logic
// above is unchanged.
export default function TripsHomeSection({
  labels,
  photos,
  openTrip,
  isAuthenticated,
  locale = 'ar',
}: {
  labels: TripsLabels
  photos: TripPhoto[]
  openTrip: TripRow | null
  isAuthenticated: boolean
  locale?: string
}) {
  if (photos.length === 0 && !openTrip) return null

  const applyHref = openTrip ? `/trips/${openTrip.id}/apply` : '/trips'
  const accepting = openTrip ? isTripAcceptingApplications(openTrip) : false

  return (
    <section className="scroll-reveal border-t border-[#55684A]/10 bg-[#F6F5EE] px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#55684A]">{labels.eyebrow}</p>
            <WordRevealText
              as="h2"
              text={labels.heading}
              dimBackground="#F6F5EE"
              className="mt-3 block font-serif text-4xl leading-tight text-[#34472B] sm:text-5xl"
            />
            <p className="mt-4 max-w-2xl text-base leading-8 text-[#34472B]/75">{labels.subtitle}</p>
          </div>
          <Link href="/journeys" className="text-sm font-semibold text-[#55684A] underline-offset-4 hover:underline">
            {labels.viewAllLabel}
          </Link>
        </div>
      </div>

      {photos.length > 0 && (
        <div className="mt-10 overflow-hidden">
          <div className="mx-auto max-w-7xl px-0">
            <TripPhotoStrip photos={photos} photoAlt={labels.photoAlt} />
          </div>
        </div>
      )}

      {openTrip && (
        <div className="mx-auto mt-10 max-w-7xl">
          <TripCard
            trip={openTrip}
            badgeLabel={accepting ? labels.registrationOpenBadge : labels.applicationsClosedBadge}
            deadlineLabel={labels.deadlineLabel}
            dateLabel={labels.dateLabel}
            locationLabel={labels.locationLabel}
            locale={locale}
            cta={
              accepting ? (
                <div>
                  <p className="mb-4 text-sm text-[#34472B]/75">{labels.applyNote}</p>
                  {isAuthenticated ? (
                    <Link
                      href={applyHref}
                      className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#55684A] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#34472B]"
                    >
                      {labels.applyButton}
                    </Link>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-3">
                        <Link
                          href={`/login?returnTo=${encodeURIComponent(applyHref)}`}
                          className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#55684A] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#34472B]"
                        >
                          {labels.loginToApply}
                        </Link>
                        <Link
                          href={`/sign-up?returnTo=${encodeURIComponent(applyHref)}`}
                          className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#55684A]/35 px-7 py-3 text-sm font-semibold text-[#55684A] transition hover:bg-[#E4ECD6]/45"
                        >
                          {labels.createAccount}
                        </Link>
                      </div>
                      <p className="mt-3 text-xs text-[#55684A]/70">{labels.membersOnlyNote}</p>
                    </>
                  )}
                </div>
              ) : null
            }
          />
        </div>
      )}
    </section>
  )
}

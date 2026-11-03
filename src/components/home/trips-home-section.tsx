import Link from 'next/link'
import TripPhotoStrip, { type TripPhoto } from '@/components/trips/trip-photo-strip'
import TripCard from '@/components/trips/trip-card'
import type { TripRow } from '@/lib/trips'

type TripsLabels = {
  eyebrow: string
  heading: string
  subtitle: string
  pauseMotion: string
  resumeMotion: string
  photoAlt: string
  registrationOpenBadge: string
  deadlineLabel: string
  applyNote: string
  loginToApply: string
  createAccount: string
  membersOnlyNote: string
  applyButton: string
}

// Renders nothing at all - no eyebrow, no heading, no strip - when there's
// neither a published photo nor an open trip to show, same "hide the whole
// section" rule the reviews section follows for an empty approved list.
export default function TripsHomeSection({
  labels,
  photos,
  openTrip,
  isAuthenticated,
}: {
  labels: TripsLabels
  photos: TripPhoto[]
  openTrip: TripRow | null
  isAuthenticated: boolean
}) {
  if (photos.length === 0 && !openTrip) return null

  const applyHref = openTrip ? `/trips/${openTrip.id}/apply` : '/trips'

  return (
    <section className="border-t border-[#617A55]/10 px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#617A55]">{labels.eyebrow}</p>
        <h2 className="mt-3 font-serif text-4xl leading-tight text-[#25311f] sm:text-5xl">{labels.heading}</h2>
        <p className="mt-4 max-w-2xl text-base leading-8 text-[#4f5d49]">{labels.subtitle}</p>
      </div>

      {photos.length > 0 && (
        <div className="mt-10 overflow-hidden">
          <div className="mx-auto max-w-7xl px-0">
            <TripPhotoStrip
              photos={photos}
              pauseLabel={labels.pauseMotion}
              resumeLabel={labels.resumeMotion}
              photoAlt={labels.photoAlt}
            />
          </div>
        </div>
      )}

      {openTrip && (
        <div className="mx-auto mt-10 max-w-7xl">
          <TripCard
            trip={openTrip}
            badgeLabel={labels.registrationOpenBadge}
            deadlineLabel={labels.deadlineLabel}
            cta={
              <div>
                <p className="mb-4 text-sm text-[#4f5d49]">{labels.applyNote}</p>
                {isAuthenticated ? (
                  <Link
                    href={applyHref}
                    className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#617A55] px-7 py-3 text-sm font-semibold text-[#F7F6F0] transition-colors hover:bg-[#617A55]/90"
                  >
                    {labels.applyButton}
                  </Link>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-3">
                      <Link
                        href={`/login?returnTo=${encodeURIComponent(applyHref)}`}
                        className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#617A55] px-7 py-3 text-sm font-semibold text-[#F7F6F0] transition-colors hover:bg-[#617A55]/90"
                      >
                        {labels.loginToApply}
                      </Link>
                      <Link
                        href={`/sign-up?returnTo=${encodeURIComponent(applyHref)}`}
                        className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#617A55]/35 px-7 py-3 text-sm font-semibold text-[#617A55] transition-colors hover:bg-[#D6E2B6]/45"
                      >
                        {labels.createAccount}
                      </Link>
                    </div>
                    <p className="mt-3 text-xs text-[#617A55]/70">{labels.membersOnlyNote}</p>
                  </>
                )}
              </div>
            }
          />
        </div>
      )}
    </section>
  )
}

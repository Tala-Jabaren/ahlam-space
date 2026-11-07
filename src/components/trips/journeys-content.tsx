import Image from 'next/image'
import Link from 'next/link'
import TripPhotoStrip, { type TripPhoto } from '@/components/trips/trip-photo-strip'
import { formatTripDate } from '@/components/trips/trip-card'
import type { TripRow } from '@/lib/trips'

export type JourneysCopy = {
  heading: string
  paragraphBase: string
  paragraphPhotosSuffix: string
  photoAlt: string
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
  noOpenTrip: string
}

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55684A]'
const primaryButton = `inline-flex min-h-12 items-center justify-center rounded-full bg-[#55684A] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#34472B] ${focusRing}`
const secondaryButton = `inline-flex min-h-12 items-center justify-center rounded-full border border-[#55684A]/40 px-7 py-3 text-sm font-semibold text-[#55684A] transition hover:bg-[#E4ECD6] ${focusRing}`

// Pure presentational piece of /journeys - the page itself only fetches
// data and passes it in, so this can also be rendered with fabricated
// data for layout/screenshot verification without touching Supabase.
export default function JourneysContent({
  copy,
  dir,
  locale,
  isAuthenticated,
  openTrip,
  accepting,
  applyPath,
  photos,
}: {
  copy: JourneysCopy
  dir: 'rtl' | 'ltr'
  locale: string
  isAuthenticated: boolean
  openTrip: TripRow | null
  accepting: boolean
  applyPath: string
  photos: TripPhoto[]
}) {
  return (
    <div dir={dir} className="bg-[#F6F5EE] text-[#34472B]">
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
        <h1 className="font-serif text-4xl leading-tight text-[#34472B] sm:text-5xl">{copy.heading}</h1>
        <p className="mt-3 max-w-2xl text-base leading-8 text-[#34472B]/80">
          {copy.paragraphBase}
          {photos.length > 0 ? ` ${copy.paragraphPhotosSuffix}` : ''}
        </p>

        {photos.length > 0 && (
          <div className="mt-6">
            <TripPhotoStrip photos={photos} photoAlt={copy.photoAlt} showCaptions />
          </div>
        )}

        <div className="mt-8">
          {!openTrip ? (
            <p className="rounded-2xl bg-[#E4ECD6] p-6 text-center text-sm leading-7 text-[#34472B]">
              {copy.noOpenTrip}
            </p>
          ) : (
            <article className="overflow-hidden rounded-2xl border border-[#55684A]/20 bg-white sm:grid sm:grid-cols-2">
              <div className="relative h-56 sm:order-last sm:h-full sm:min-h-[320px]">
                {openTrip.cover_image_url ? (
                  <Image
                    src={openTrip.cover_image_url}
                    alt={openTrip.title}
                    fill
                    sizes="(min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="size-full bg-[#E4ECD6]" />
                )}
              </div>
              <div className="p-6 sm:p-8">
                <span className="inline-flex rounded-full bg-[#E4ECD6] px-3 py-1 text-xs font-semibold text-[#34472B]">
                  {accepting ? copy.registrationOpenBadge : copy.applicationsClosedBadge}
                </span>
                <h2 className="mt-4 font-serif text-2xl text-[#34472B] sm:text-3xl">{openTrip.title}</h2>
                <dl className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-sm text-[#34472B]/80">
                  <div className="flex gap-1">
                    <dt className="sr-only">{copy.dateLabel}</dt>
                    <dd>
                      {formatTripDate(openTrip.starts_on, locale)}
                      {openTrip.ends_on !== openTrip.starts_on ? ` - ${formatTripDate(openTrip.ends_on, locale)}` : ''}
                    </dd>
                  </div>
                  <span aria-hidden="true">·</span>
                  <div className="flex gap-1">
                    <dt className="sr-only">{copy.locationLabel}</dt>
                    <dd>{openTrip.location}</dd>
                  </div>
                  {openTrip.application_deadline && (
                    <>
                      <span aria-hidden="true">·</span>
                      <div className="flex gap-1">
                        <dt>{copy.deadlineLabel}:</dt>
                        <dd>{formatTripDate(openTrip.application_deadline, locale)}</dd>
                      </div>
                    </>
                  )}
                </dl>
                <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-[#34472B]/80">{openTrip.description}</p>

                {accepting && (
                  <div className="mt-6">
                    <p className="mb-4 text-sm text-[#34472B]/80">{copy.applyNote}</p>
                    {isAuthenticated ? (
                      <Link href={applyPath} className={primaryButton}>
                        {copy.applyButton}
                      </Link>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-3">
                          <Link href={`/login?returnTo=${encodeURIComponent(applyPath)}`} className={primaryButton}>
                            {copy.loginToApply}
                          </Link>
                          <Link href={`/sign-up?returnTo=${encodeURIComponent(applyPath)}`} className={secondaryButton}>
                            {copy.createAccount}
                          </Link>
                        </div>
                        <p className="mt-3 text-xs text-[#34472B]/70">{copy.membersOnlyNote}</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </article>
          )}
        </div>
      </section>
    </div>
  )
}

import type { TripRow } from '@/lib/trips'

export function formatTripDate(date: string) {
  return new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`)
  )
}

// Shared by the public home section and the member /trips page - same
// badge/title/meta/description layout, the caller owns the CTA area
// (login+signup buttons, a single apply button, or nothing) since that
// part depends on who's looking at it.
export default function TripCard({
  trip,
  badgeLabel,
  deadlineLabel,
  cta,
  photoSlot,
}: {
  trip: TripRow
  badgeLabel: string
  deadlineLabel: string
  cta: React.ReactNode
  photoSlot?: React.ReactNode
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[#617A55]/15 bg-white sm:grid sm:grid-cols-2">
      <div className="p-6 sm:p-8">
        <span className="inline-flex rounded-full bg-[#D6E2B6]/60 px-3 py-1 text-xs font-semibold text-[#617A55]">
          {badgeLabel}
        </span>
        <h3 className="mt-4 font-serif text-2xl text-[#25311f] sm:text-3xl">{trip.title}</h3>
        <dl className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-sm text-[#4f5d49]">
          <div className="flex gap-1">
            <dt className="sr-only">التاريخ</dt>
            <dd>
              {formatTripDate(trip.starts_on)}
              {trip.ends_on !== trip.starts_on ? ` - ${formatTripDate(trip.ends_on)}` : ''}
            </dd>
          </div>
          <span aria-hidden="true">·</span>
          <div className="flex gap-1">
            <dt className="sr-only">الموقع</dt>
            <dd>{trip.location}</dd>
          </div>
          {trip.application_deadline && (
            <>
              <span aria-hidden="true">·</span>
              <div className="flex gap-1">
                <dt>{deadlineLabel}:</dt>
                <dd>{formatTripDate(trip.application_deadline)}</dd>
              </div>
            </>
          )}
        </dl>
        <p className="mt-4 text-sm leading-7 text-[#4f5d49]">{trip.description}</p>
        <div className="mt-6">{cta}</div>
      </div>
      {photoSlot ? (
        <div className="relative hidden min-h-[260px] sm:block">{photoSlot}</div>
      ) : trip.cover_image_url ? (
        <div className="relative hidden min-h-[260px] sm:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={trip.cover_image_url} alt="" className="absolute inset-0 size-full object-cover" />
        </div>
      ) : null}
    </article>
  )
}

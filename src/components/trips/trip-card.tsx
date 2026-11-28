import { CalendarDays, CalendarClock, ChevronDown, Clock, MapPin, Navigation, UsersRound } from 'lucide-react'
import type { TripRow } from '@/lib/trips'
import TripImageCarousel from './trip-image-carousel'

export function formatTripDate(date: string, locale: string = 'ar', withWeekday = false) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en-US', {
    weekday: withWeekday ? 'long' : undefined,
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))
}

// meeting_time is a plain 'HH:MM:SS' wall-clock value, same display
// convention as formatSessionTime in src/lib/email/class-reminder-email.ts
// (just slice off the seconds) - no timezone conversion, since it's not a
// timestamp.
export function formatMeetingTime(time: string) {
  return time.slice(0, 5)
}

export default function TripCard({
  trip,
  badgeLabel,
  deadlineLabel,
  dateLabel = 'التاريخ',
  locationLabel = 'الموقع',
  meetingLabel = 'ساعة التجمع',
  locale = 'ar',
  headingLevel = 3,
  cta,
  images,
}: {
  trip: TripRow
  badgeLabel: string
  deadlineLabel: string
  dateLabel?: string
  locationLabel?: string
  meetingLabel?: string
  locale?: string
  headingLevel?: 2 | 3
  cta: React.ReactNode
  images?: string[]
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  const slides = images ?? (trip.cover_image_url ? [trip.cover_image_url] : [])
  const hasImages = slides.length > 0
  const arabic = locale === 'ar'
  const dateRange = (
    <>
      <time dateTime={trip.starts_on}>{formatTripDate(trip.starts_on, locale, true)}</time>
      {trip.ends_on !== trip.starts_on && (
        <> – <time dateTime={trip.ends_on}>{formatTripDate(trip.ends_on, locale, true)}</time></>
      )}
    </>
  )
  const deadline = trip.application_deadline && (
    <time dateTime={trip.application_deadline}>{formatTripDate(trip.application_deadline, locale, true)}</time>
  )
  const time = trip.meeting_time && formatMeetingTime(trip.meeting_time)
  const facts = [
    { icon: CalendarDays, label: dateLabel, value: dateRange, wide: trip.starts_on !== trip.ends_on },
    { icon: MapPin, label: locationLabel, value: trip.location },
    { icon: CalendarClock, label: deadlineLabel, value: deadline },
    { icon: Clock, label: meetingLabel, value: time && <time dateTime={time}><bdi dir="ltr">{time}</bdi></time> },
    { icon: Navigation, label: arabic ? 'مكان التجمّع' : 'Meeting point', value: trip.meeting_point },
    { icon: UsersRound, label: arabic ? 'سعة المشوار' : 'Trip capacity', value: trip.capacity === null ? null : new Intl.NumberFormat(locale).format(trip.capacity) },
  ]

  return (
    <article className={`group/trip-card overflow-hidden rounded-2xl border border-[#617A55]/15 bg-white ${hasImages ? 'sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]' : ''}`}>
      {hasImages && (
        <TripImageCarousel
          images={slides}
          title={trip.title}
          locale={locale}
          className="h-36 group-has-[details[open]]/trip-card:h-56 sm:col-start-2 sm:row-start-1 sm:h-auto sm:min-h-52 sm:group-has-[details[open]]/trip-card:h-auto"
        />
      )}
      <div className="min-w-0 px-4 py-3 sm:col-start-1 sm:row-start-1 sm:px-5 sm:py-4">
        <span className="inline-flex rounded-full bg-[#D6E2B6]/60 px-3 py-1 text-xs font-semibold text-[#617A55]">
          {badgeLabel}
        </span>
        <Heading className="mt-1 break-words font-serif text-xl leading-snug text-[#25311f] sm:text-2xl">{trip.title}</Heading>
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3 rounded-xl border border-[#617A55]/20 bg-[#EAF0E1] p-3">
          {facts.map(({ icon: Icon, label, value, wide }) => value && (
            <div key={label} className={`min-w-0 ${wide ? 'col-span-2' : ''}`}>
              <dt className="flex items-center gap-1.5 text-xs font-semibold text-[#465d3d]">
                <Icon size={15} aria-hidden="true" className="shrink-0" />
                {label}
              </dt>
              <dd className="mt-1 break-words ps-[21px] text-sm font-medium leading-5 text-[#25311f]">{value}</dd>
            </div>
          ))}
        </dl>
        {trip.description && (
          <p className="mt-2 line-clamp-5 whitespace-pre-wrap break-words text-sm leading-6 text-[#4f5d49] group-has-[details[open]]/trip-card:hidden">
            {trip.description}
          </p>
        )}
        <details className="group mt-1">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg text-sm font-semibold text-[#465d3d] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">{arabic ? 'اقرئي المزيد' : 'Read more'}</span>
            <span className="hidden group-open:inline">{arabic ? 'إخفاء التفاصيل' : 'Hide details'}</span>
            <ChevronDown aria-hidden="true" size={16} className="group-open:rotate-180" />
          </summary>
          <div className="border-t border-[#617A55]/15 pt-3 text-sm text-[#4f5d49]">
            {trip.description && <p className="mt-2 whitespace-pre-wrap break-words leading-7">{trip.description}</p>}
            {cta && <div className="mt-4">{cta}</div>}
          </div>
        </details>
      </div>
    </article>
  )
}

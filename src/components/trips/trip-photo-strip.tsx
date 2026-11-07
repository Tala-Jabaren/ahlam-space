'use client'

import { useSyncExternalStore } from 'react'

export type TripPhoto = {
  id: string
  photo_url: string
  caption: string | null
}

// Shared by the public home page section and the member-area /trips page -
// same strip, same behavior, just different surrounding copy per caller.
// Always moving by design - no pause button, no hover-to-pause, no
// focus-to-pause. The one exception is prefers-reduced-motion: that's an
// OS-level accessibility setting the visitor turned on for their whole
// device, not a manual control on this page, so it still gets a fully
// static, scrollable row instead of the animation.
export default function TripPhotoStrip({
  photos,
  photoAlt = 'صورة من مشوار سابق',
}: {
  photos: TripPhoto[]
  photoAlt?: string
}) {
  // useSyncExternalStore (same pattern already used in src/app/(auth)/
  // login/page.tsx for its own matchMedia-free client-only check) reads
  // the external browser API without a hydration mismatch: the server
  // snapshot is always false, the client subscribes to real changes.
  const reducedMotion = useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)')
      query.addEventListener('change', onChange)
      return () => query.removeEventListener('change', onChange)
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false
  )

  if (photos.length === 0) return null

  // Doubled so the 50% translate in globals.css loops seamlessly - the
  // second copy is aria-hidden so screen readers don't hear every photo
  // announced twice.
  const doubled = reducedMotion ? photos : [...photos, ...photos]

  return (
    <div className="relative">
      <div className="overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ul
          className={`flex w-max gap-5 ${
            reducedMotion ? 'snap-x snap-mandatory' : 'trip-strip-track-animate'
          }`}
        >
          {doubled.map((photo, index) => (
            <li
              key={`${photo.id}-${index}`}
              aria-hidden={index >= photos.length ? 'true' : undefined}
              className="relative h-56 w-72 shrink-0 snap-start overflow-hidden rounded-2xl border border-[#617A55]/15 bg-[#D6E2B6]/30 sm:h-64 sm:w-80"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.photo_url}
                alt={photo.caption ?? photoAlt}
                className="size-full object-cover"
                loading="lazy"
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

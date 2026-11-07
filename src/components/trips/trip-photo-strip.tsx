'use client'

import { useState, useSyncExternalStore } from 'react'

export type TripPhoto = {
  id: string
  photo_url: string
  caption: string | null
}

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55]'

// Shared by the public home page section, the member-area /trips page, and
// the public /journeys page - same strip, same behavior, just different
// surrounding copy per caller. Moves continuously by default (no pause
// button, no hover/focus-to-pause) - set pausable to opt a specific caller
// into a real pause/resume button plus hover (mouse only) and keyboard-
// focus pausing, which /journeys needs per its own design brief. Either
// way, prefers-reduced-motion always wins: no animation, a fully static
// scrollable row, and (when pausable) the now-redundant button hidden,
// since that's an OS-level accessibility setting, not a page control.
export default function TripPhotoStrip({
  photos,
  photoAlt = 'صورة من مشوار سابق',
  pausable = false,
  pauseLabel = 'إيقاف حركة الصور',
  resumeLabel = 'تشغيل حركة الصور',
  showCaptions = false,
}: {
  photos: TripPhoto[]
  photoAlt?: string
  pausable?: boolean
  pauseLabel?: string
  resumeLabel?: string
  showCaptions?: boolean
}) {
  const [manuallyPaused, setManuallyPaused] = useState(false)
  const [hovering, setHovering] = useState(false)
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

  const isPaused = pausable && (manuallyPaused || hovering)
  // Doubled so the 50% translate in globals.css loops seamlessly - the
  // second copy is aria-hidden so screen readers don't hear every photo
  // announced twice.
  const doubled = reducedMotion ? photos : [...photos, ...photos]

  return (
    <div className="relative">
      {pausable && !reducedMotion && (
        <button
          type="button"
          onClick={() => setManuallyPaused((value) => !value)}
          aria-pressed={manuallyPaused}
          className={`mb-4 inline-flex min-h-11 items-center rounded-full border border-[#617A55]/25 px-4 text-sm font-semibold text-[#617A55] transition hover:bg-[#D6E2B6]/40 ${focusRing}`}
        >
          {manuallyPaused ? resumeLabel : pauseLabel}
        </button>
      )}

      <div
        className="overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        {...(pausable
          ? {
              onPointerEnter: (event: React.PointerEvent) => {
                if (event.pointerType === 'mouse') setHovering(true)
              },
              onPointerLeave: (event: React.PointerEvent) => {
                if (event.pointerType === 'mouse') setHovering(false)
              },
              onFocus: () => setHovering(true),
              onBlur: (event: React.FocusEvent) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHovering(false)
              },
            }
          : {})}
      >
        <ul
          data-paused={pausable ? isPaused : undefined}
          className={`flex w-max gap-5 ${
            reducedMotion ? 'snap-x snap-mandatory' : 'trip-strip-track-animate'
          }`}
        >
          {doubled.map((photo, index) => (
            <li
              key={`${photo.id}-${index}`}
              aria-hidden={index >= photos.length ? 'true' : undefined}
              className="w-72 shrink-0 snap-start sm:w-80"
            >
              <div className="relative h-56 overflow-hidden rounded-2xl border border-[#617A55]/15 bg-[#D6E2B6]/30 sm:h-64">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.photo_url}
                  alt={photo.caption ?? photoAlt}
                  className="size-full object-cover"
                  loading="lazy"
                />
              </div>
              {showCaptions && photo.caption && (
                <p className="mt-2 break-words text-sm text-[#617A55]">{photo.caption}</p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

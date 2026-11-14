import Image from 'next/image'
import StatsSection from './stats-section'
import type { SiteStat } from '@/content/site-stats'

export type ArcGalleryPhoto = {
  src: string
  alt: string
}

// One index angle per photo, spread evenly from -spreadDeg to +spreadDeg
// (the centre photo, for an odd count, lands exactly on 0deg - "upright
// at the top centre" per spec). A single photo just sits at 0.
function computeAngles(count: number, spreadDeg: number) {
  if (count === 1) return [0]
  return Array.from({ length: count }, (_, i) => -spreadDeg + (2 * spreadDeg * i) / (count - 1))
}

// Only 5 contiguous photos, centered in the array, show on mobile - a
// dedicated, shallower phone design, not the desktop arc scaled down (see
// the CSS for --radius/--peak/angle differences). (Distance-from-center
// ranking doesn't give a stable choice here: for an even count, two
// photos always tie for "furthest," so picking by distance can't commit
// to dropping just one of them - a plain centered window always can.)
function mobileWindowStart(count: number) {
  return count <= 5 ? 0 : Math.floor((count - 5) / 2)
}

// Hidden entirely below 3 photos - nothing worth a section for once the
// arc has nothing to draw. Stats still render (as a plain centered block,
// same component) so they're never silently lost if the photo count ever
// drops below 3.
export default function ArcGallerySection({
  photos,
  stats,
  eyebrow,
}: {
  photos: ArcGalleryPhoto[]
  stats: SiteStat[]
  eyebrow: string
}) {
  if (photos.length < 3) {
    return (
      <section className="scroll-reveal px-5 py-12 sm:px-8 lg:px-10" style={{ background: 'linear-gradient(to bottom, var(--blue-mist), #F6F5EE)' }}>
        <StatsSection stats={stats} eyebrow={eyebrow} />
      </section>
    )
  }

  const n = photos.length
  const wide = n >= 5
  const anglesLg = computeAngles(n, wide ? 70 : 40)

  // Mobile angles are computed over the VISIBLE window only (3-5 photos,
  // always -30..+30deg) - independent of the desktop wide/narrow tiering
  // and of the total photo count, so the phone fan always has the same
  // gentle shape regardless of how many photos exist in total.
  const mobileVisibleCount = Math.min(n, 5)
  const anglesSmVisible = computeAngles(mobileVisibleCount, 30)
  const mobileStart = mobileWindowStart(n)

  return (
    <section
      className="scroll-reveal px-5 pb-6 pt-8 sm:px-8 sm:pb-8 sm:pt-12 lg:px-10"
      style={{ background: 'linear-gradient(to bottom, var(--blue-mist), #F6F5EE)' }}
    >
      {/* arc-spread-container is the tall (130vh), scroll-timeline-driven
          outer box; arc-sticky-box pins the actual visual at top: 8vh
          while the visitor scrolls through that extra height, playing
          the collapse-to-spread animation natively (position: sticky,
          never a wheel/JS scroll hijack) - see globals.css for both.
          arc-sticky-box's own height is auto, driven entirely by its one
          in-flow child (arc-stats-slot) - the photos are all absolutely
          positioned and contribute nothing to that height themselves, so
          there's never a fixed/estimated height fighting the real content
          (see the arc-stats-slot padding-top in globals.css for how it
          clears the photo dome before the stats block begins). */}
      <div className="arc-spread-container mx-auto max-w-5xl">
        <div className="arc-sticky-box">
          <div className="arc-tick-ring" aria-hidden="true" />
          {photos.map((photo, index) => {
            const angleLg = anglesLg[index]
            const mobileSlot = index - mobileStart
            const isMobileVisible = mobileSlot >= 0 && mobileSlot < mobileVisibleCount
            const angleSm = isMobileVisible ? anglesSmVisible[mobileSlot] : angleLg
            return (
              <div
                key={photo.src}
                className={`arc-photo w-[86px] h-[114px] md:w-[170px] md:h-[215px] ${isMobileVisible ? '' : 'hidden md:block'}`}
                style={
                  {
                    '--angle-lg': `${angleLg}deg`,
                    '--angle-sm': `${angleSm}deg`,
                    zIndex: 100 - Math.round(Math.abs(angleLg)),
                  } as React.CSSProperties
                }
              >
                <div className="size-full overflow-hidden rounded-3xl shadow-[0_12px_28px_rgba(52,71,43,0.2)]">
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    width={170}
                    height={215}
                    loading="lazy"
                    className="size-full object-cover"
                  />
                </div>
              </div>
            )
          })}
          <div className="arc-stats-slot">
            <StatsSection stats={stats} eyebrow={eyebrow} />
          </div>
        </div>
      </div>
    </section>
  )
}

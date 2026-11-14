import Image from 'next/image'
import StatsSection from './stats-section'
import MobileArcCarousel from './mobile-arc-carousel'
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

// Hidden entirely below 3 photos - nothing worth a gallery for once there
// aren't enough photos for either layout. Stats still render (as a plain
// centered block) so they're never silently lost.
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
  const angles = computeAngles(n, wide ? 70 : 40)

  return (
    <section
      className="scroll-reveal overflow-x-clip px-5 pb-6 pt-8 sm:px-8 sm:pb-8 sm:pt-12 lg:px-10"
      style={{ background: 'linear-gradient(to bottom, var(--blue-mist), #F6F5EE)' }}
    >
      {/* Two entirely separate layouts, CSS-switched at 769px (.arc-desktop/
          .arc-mobile in globals.css) - never a window-width check in render,
          so there's no hydration mismatch; both trees exist in the DOM on
          every render, only one is ever laid out/visible. */}

      {/* ===== Desktop (>=769px): half-circle arc, dashed ring, stats
          centered inside the ring's own visible hollow ===== */}
      <div className="arc-desktop">
        <div className="arc-spread-container mx-auto max-w-5xl">
          <div className="arc-sticky-box">
            <div className="arc-tick-ring" aria-hidden="true" />
            {photos.map((photo, index) => {
              const angle = angles[index]
              return (
                <div
                  key={photo.src}
                  className="arc-photo w-[170px] h-[215px]"
                  style={{ '--angle': `${angle}deg`, zIndex: 100 - Math.round(Math.abs(angle)) } as React.CSSProperties}
                >
                  <div className="size-full overflow-hidden rounded-3xl shadow-[0_12px_28px_rgba(52,71,43,0.2)]">
                    <Image src={photo.src} alt={photo.alt} width={170} height={215} loading="lazy" className="size-full object-cover" />
                  </div>
                </div>
              )
            })}
            <div className="arc-stats-slot">
              <StatsSection stats={stats} eyebrow={eyebrow} />
            </div>
          </div>
        </div>
      </div>

      {/* ===== Mobile (<=768px): swipeable scroll-snap carousel, stats
          directly below with a small overlap ===== */}
      <div className="arc-mobile">
        <MobileArcCarousel photos={photos} eyebrow={eyebrow} />
        <div className="arc-mobile-stats">
          <StatsSection stats={stats} eyebrow={eyebrow} />
        </div>
      </div>
    </section>
  )
}

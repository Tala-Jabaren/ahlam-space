import Image from 'next/image'

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
// shallower, narrower arc rather than the full desktop spread, so nothing
// ever pushes the page wider than the viewport. (Distance-from-center
// ranking doesn't give a stable choice here: for an even count, two
// photos always tie for "furthest," so picking by distance can't commit
// to dropping just one of them - a plain centered window always can.)
function isMobileVisible(index: number, count: number) {
  if (count <= 5) return true
  const start = Math.floor((count - 5) / 2)
  return index >= start && index < start + 5
}

// Hidden entirely below 3 photos - nothing worth a section for once the
// arc has nothing to draw.
export default function ArcGallerySection({ photos }: { photos: ArcGalleryPhoto[] }) {
  if (photos.length < 3) return null

  const n = photos.length
  const wide = n >= 5
  const anglesLg = computeAngles(n, wide ? 70 : 40)
  const anglesSm = computeAngles(n, wide ? 55 : 40)

  return (
    <section
      className="scroll-reveal overflow-hidden px-5 pb-10 pt-8 sm:px-8 sm:pt-12 lg:px-10"
      style={{ background: 'linear-gradient(to bottom, var(--blue-mist), #F6F5EE)' }}
    >
      {/* arc-spread-container is the tall (200vh), scroll-timeline-driven
          outer box; arc-sticky-box pins the actual visual at top: 8vh
          while the visitor scrolls through that extra height, playing
          the collapse-to-spread animation natively (position: sticky,
          never a wheel/JS scroll hijack) - see globals.css for both. */}
      <div className="arc-spread-container mx-auto max-w-5xl">
        <div className="arc-sticky-box">
          <div className="arc-tick-ring" aria-hidden="true" />
          {photos.map((photo, index) => {
            const angleLg = anglesLg[index]
            const angleSm = anglesSm[index]
            return (
              <div
                key={photo.src}
                className={`arc-photo w-[130px] h-[170px] md:w-[220px] md:h-[280px] ${isMobileVisible(index, n) ? '' : 'hidden md:block'}`}
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
                    width={220}
                    height={280}
                    loading="lazy"
                    className="size-full object-cover"
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

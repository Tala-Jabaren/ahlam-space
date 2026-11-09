import Image from 'next/image'

export type ArcGalleryPhoto = {
  src: string
  alt: string
}

// Fan layout computed server-side with plain trig - no client JS needed
// just to place photos on an arc. Angles spread evenly around the
// vertical axis; x/y are percentages of the arc container so the layout
// scales with it instead of needing separate desktop/mobile coordinate
// sets. The scroll-driven sweep (arc-rotate-wrapper, see globals.css)
// rotates the whole arrangement; each photo's OWN inline rotate cancels
// that same live value so its individual tilt stays visually put.
function computeFan(count: number) {
  const spreadDeg = 62
  // rem, not % - a transform translate() percentage is relative to the
  // ELEMENT's own box, not its container, so it can't place a 160px photo
  // out across a 700px-wide arc. rem gives a stable, viewport-independent
  // radius instead.
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0.5 : i / (count - 1)
    const angleDeg = (t - 0.5) * 2 * spreadDeg
    const angleRad = (angleDeg * Math.PI) / 180
    const xRem = Math.sin(angleRad) * 11
    const yRem = (1 - Math.cos(angleRad)) * 7
    const tilt = angleDeg * 0.56
    return { xRem, yRem, tilt }
  })
}

// Only 3 contiguous photos, centered in the array, show on mobile - a
// shallower, narrower arc rather than the full desktop spread, so nothing
// ever pushes the page wider than the viewport. (Distance-from-center
// ranking doesn't give a stable choice here: for an even count, two
// photos always tie for "furthest," so picking by distance can't commit
// to dropping just one of them - a plain centered window always can.)
function isMobileVisible(index: number, count: number) {
  if (count <= 3) return true
  const start = Math.floor((count - 3) / 2)
  return index >= start && index < start + 3
}

// Hidden entirely below 3 photos - the section was previously a fallback
// text block (heading/paragraph/CTA) plus the photo fan, but that text
// moved out (see page.tsx, StatsSection now sits where it was); with
// nothing left to show but the fan itself, there's nothing worth a
// section for once the fan has nothing to draw.
export default function ArcGallerySection({ photos }: { photos: ArcGalleryPhoto[] }) {
  if (photos.length < 3) return null
  const fan = computeFan(photos.length)

  return (
    <section
      className="scroll-reveal overflow-hidden px-5 pb-10 pt-8 sm:px-8 sm:pt-12 lg:px-10"
      style={{ background: 'linear-gradient(to bottom, var(--blue-mist), #F6F5EE)' }}
    >
      <div className="relative mx-auto h-[300px] max-w-3xl sm:h-[400px]">
        <svg
          aria-hidden="true"
          viewBox="0 0 400 200"
          className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-full w-full text-[var(--blue-soft)]/60"
        >
          {Array.from({ length: 37 }, (_, i) => {
            const angle = (-90 + i * 5) * (Math.PI / 180)
            const r1 = 185
            const r2 = 195
            const cx = 200
            const cy = 200
            return (
              <line
                key={i}
                x1={cx + r1 * Math.cos(angle)}
                y1={cy + r1 * Math.sin(angle)}
                x2={cx + r2 * Math.cos(angle)}
                y2={cy + r2 * Math.sin(angle)}
                stroke="currentColor"
                strokeWidth="1.5"
              />
            )
          })}
        </svg>

        <div className="arc-rotate-wrapper absolute inset-0">
          {photos.map((photo, index) => {
            const { xRem, yRem, tilt } = fan[index]
            return (
              <div
                key={photo.src}
                className={`absolute left-1/2 top-1/2 w-[120px] sm:w-[160px] ${
                  isMobileVisible(index, photos.length) ? '' : 'hidden sm:block'
                }`}
                style={{
                  transform: `translate(-50%, -50%) translate(${xRem}rem, ${yRem}rem) rotate(${tilt}deg) rotate(calc(var(--arc-rotate, 0deg) * -1))`,
                }}
              >
                <div className="aspect-[5/6] overflow-hidden rounded-3xl shadow-[0_12px_28px_rgba(52,71,43,0.2)]">
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    width={160}
                    height={192}
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

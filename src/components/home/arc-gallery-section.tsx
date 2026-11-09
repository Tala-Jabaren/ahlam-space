import Image from 'next/image'
import WordRevealText from './word-reveal-text'

export type ArcGalleryPhoto = {
  src: string
  alt: string
}

type ArcGalleryCopy = {
  eyebrow: string
  heading: string
  accentWord: string
  paragraph: string
  button: string
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

export default function ArcGallerySection({ copy, photos }: { copy: ArcGalleryCopy; photos: ArcGalleryPhoto[] }) {
  const showArc = photos.length >= 3
  const fan = showArc ? computeFan(photos.length) : []

  return (
    <section className="scroll-reveal overflow-hidden bg-[#F6F5EE] px-5 pb-20 pt-8 sm:px-8 sm:pt-12 lg:px-10">
      <div className="relative mx-auto max-w-5xl">
        {showArc && (
          <div className="relative mx-auto h-[300px] max-w-3xl sm:h-[400px]" aria-hidden="false">
            <svg
              aria-hidden="true"
              viewBox="0 0 400 200"
              className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-full w-full text-[#55684A]/30"
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
        )}

        <div className={`mx-auto max-w-xl text-center ${showArc ? 'mt-6' : ''}`}>
          <span className="inline-flex rounded-full bg-[#E4ECD6] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#34472B]" dir="ltr">
            {copy.eyebrow}
          </span>
          <WordRevealText
            as="h2"
            text={copy.heading}
            dimBackground="#F6F5EE"
            accentWord={copy.accentWord}
            className="mt-5 block font-serif text-3xl leading-tight text-[#34472B] sm:text-4xl"
          />
          <WordRevealText
            as="p"
            text={copy.paragraph}
            dimBackground="#F6F5EE"
            className="mt-5 block text-base leading-8 text-[#34472B]/80"
          />
          <a
            href="#services"
            className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full border border-[#55684A]/40 px-7 py-3 text-sm font-semibold text-[#55684A] transition hover:bg-[#E4ECD6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55684A]"
          >
            {copy.button}
          </a>
        </div>
      </div>
    </section>
  )
}

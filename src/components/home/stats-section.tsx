'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { SiteStat } from '@/content/site-stats'

// Divider borders: a 2x2 "cross" on mobile (2 cols), collapsing to plain
// vertical dividers in a single row on desktop (4 cols) - sm:border-t-0
// turns the mobile cross back into a single row once the grid itself
// goes from 2 columns to 4. Only handles the common, currently-deployed
// case of exactly 4 confirmed stats; anything else just gets a plain
// "divider before every item but the first," which is still correct,
// just without the cross (a <4-stat layout never actually wraps into a
// second row to need one).
function dividerClass(index: number, total: number) {
  if (total !== 4) {
    return index > 0 ? 'border-s border-[#55684A]/15' : ''
  }
  const classes = [
    index % 2 === 1 ? 'border-s border-[#55684A]/15' : '',
    index >= 2 ? 'border-t border-[#55684A]/15' : '',
  ]
  if (index === 2) classes.push('sm:border-s sm:border-t-0')
  if (index === 3) classes.push('sm:border-t-0')
  return classes.filter(Boolean).join(' ')
}

// Only counters the owner has actually signed off on (confirmed: true) ever
// reach the page - see src/content/site-stats.ts. With nothing confirmed
// yet, this renders nothing at all rather than a strip of zeros or
// placeholder numbers.
export default function StatsSection({ stats, eyebrow }: { stats: SiteStat[]; eyebrow: string }) {
  const confirmed = stats.filter((stat) => stat.confirmed)
  const sectionRef = useRef<HTMLDivElement>(null)
  const [started, setStarted] = useState(false)
  const [counting, setCounting] = useState(false)
  const [values, setValues] = useState<number[]>(() => confirmed.map(() => 0))

  // Same useSyncExternalStore matchMedia pattern already used by
  // TripPhotoStrip: server snapshot is always false, client subscribes to
  // the real preference, no hydration mismatch.
  const reducedMotion = useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)')
      query.addEventListener('change', onChange)
      return () => query.removeEventListener('change', onChange)
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false
  )

  useEffect(() => {
    if (confirmed.length === 0 || reducedMotion) return
    const node = sectionRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setStarted(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [reducedMotion, confirmed.length])

  useEffect(() => {
    if (!started || reducedMotion) return
    const duration = 1500
    const startTime = performance.now()
    let raf: number

    function tick(now: number) {
      const t = Math.min(1, (now - startTime) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setCounting(t < 1)
      setValues(confirmed.map((stat) => Math.round(stat.value * eased)))
      if (t < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, reducedMotion])

  if (confirmed.length === 0) return null

  // Tailwind needs these written out literally somewhere in the source to
  // generate them - a template string built from confirmed.length wouldn't
  // produce a class Tailwind's build ever sees. 2x2 on mobile (this
  // component is now embedded inside the arc's hollow, which is narrow -
  // sm:grid-cols-4 only kicks in once the arc itself reaches its desktop
  // width/layout) rather than a full row.
  const colsClass =
    confirmed.length >= 4
      ? 'grid-cols-2 sm:grid-cols-4'
      : confirmed.length === 3
        ? 'grid-cols-2 sm:grid-cols-3'
        : confirmed.length === 2
          ? 'grid-cols-2'
          : 'grid-cols-1'

  // No own <section>/outer padding - the caller (ArcGallerySection)
  // positions this inside the arc's hollow and owns the surrounding
  // spacing, so this is just the pill + card, centered, sized to fit a
  // narrow mobile width comfortably.
  return (
    <div ref={sectionRef} className="mx-auto flex w-full max-w-[640px] flex-col items-center text-center">
      <span className="inline-flex rounded-full bg-[#E4ECD6] px-4 py-1.5 text-xs font-semibold text-[#34472B] sm:text-sm">
        {eyebrow}
      </span>
      <div
        className={`mt-4 grid w-full max-w-[420px] gap-y-5 rounded-[2rem] bg-white p-5 shadow-[0_12px_32px_rgba(52,71,43,0.10)] sm:mt-6 sm:max-w-[1100px] sm:gap-y-8 sm:rounded-[3rem] sm:p-10 ${colsClass}`}
      >
        {confirmed.map((stat, index) => (
          <div key={stat.label} className={`px-2 text-center sm:px-4 ${dividerClass(index, confirmed.length)}`}>
            {/* dir="ltr" so the digits and the "+" sign never get
                reordered/mirrored by RTL bidi rules. */}
            <p
              className="stat-value text-2xl font-light sm:text-4xl lg:text-5xl"
              dir="ltr"
              data-counting={counting || undefined}
            >
              {reducedMotion ? stat.value : values[index]}+
            </p>
            <p
              className="mt-1 text-xs text-[#34472B]/80 transition-opacity duration-500 ease-out sm:mt-2 sm:text-sm"
              style={{ opacity: started || reducedMotion ? 1 : 0, transitionDelay: started ? '1.3s' : '0s' }}
            >
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

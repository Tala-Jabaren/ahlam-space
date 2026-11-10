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
  const sectionRef = useRef<HTMLElement>(null)
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
  // produce a class Tailwind's build ever sees.
  const colsClass =
    confirmed.length >= 4
      ? 'grid-cols-2 sm:grid-cols-4'
      : confirmed.length === 3
        ? 'grid-cols-2 sm:grid-cols-3'
        : confirmed.length === 2
          ? 'grid-cols-2'
          : 'grid-cols-1'

  return (
    <section ref={sectionRef} className="scroll-reveal px-5 py-16 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-5xl text-center">
        <span className="inline-flex rounded-full bg-[#E4ECD6] px-4 py-1.5 text-sm font-semibold text-[#34472B]">
          {eyebrow}
        </span>
        <div
          className={`mx-auto mt-8 grid max-w-[1100px] gap-y-8 rounded-[3rem] bg-white p-8 shadow-[0_12px_32px_rgba(52,71,43,0.10)] sm:p-12 ${colsClass}`}
        >
          {confirmed.map((stat, index) => (
            <div key={stat.label} className={`px-4 text-center ${dividerClass(index, confirmed.length)}`}>
              <p className="stat-value text-4xl font-light sm:text-5xl" data-counting={counting || undefined}>
                {reducedMotion ? stat.value : values[index]}+
              </p>
              <p
                className="mt-2 text-sm text-[#34472B]/80 transition-opacity duration-500 ease-out"
                style={{ opacity: started || reducedMotion ? 1 : 0, transitionDelay: started ? '1.3s' : '0s' }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

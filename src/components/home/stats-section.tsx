'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { SiteStat } from '@/content/site-stats'

// Only counters the owner has actually signed off on (confirmed: true) ever
// reach the page - see src/content/site-stats.ts. With nothing confirmed
// yet, this renders nothing at all rather than a strip of zeros or
// placeholder numbers.
export default function StatsSection({ stats }: { stats: SiteStat[] }) {
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
    <section ref={sectionRef} className="scroll-reveal bg-[var(--blue-mist)] px-5 py-14 sm:px-8 lg:px-10">
      <div className={`mx-auto grid max-w-5xl ${colsClass}`}>
        {confirmed.map((stat, index) => (
          <div key={stat.label} className={`px-4 text-center ${index > 0 ? 'border-s border-[var(--blue-soft)]' : ''}`}>
            <p className="stat-value font-serif text-4xl sm:text-5xl" data-counting={counting || undefined}>
              {reducedMotion ? stat.value : values[index]}+
            </p>
            <p
              className="mt-2 text-sm text-[var(--blue-deep)] transition-opacity duration-500 ease-out"
              style={{ opacity: started || reducedMotion ? 1 : 0, transitionDelay: started ? '1.3s' : '0s' }}
            >
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

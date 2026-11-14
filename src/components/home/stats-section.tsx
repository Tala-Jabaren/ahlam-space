'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Heart, Sparkles, UserRound, Users } from 'lucide-react'
import type { SiteStat } from '@/content/site-stats'

// Purely decorative, rotated by position - the data in site-stats.ts has
// no icon field of its own (and isn't meant to; adding one there would be
// a content-shape change for a purely visual ask), so this is index-based
// the same way ReviewsSection's own fallback-avatar icons are.
const STAT_ICONS = [UserRound, Users, Heart, Sparkles]

// Always a 2x2 "cross" (both the in-circle desktop placement and the
// mobile placement below the carousel ask for a compact 2x2, never the
// old full-width single row - this component is never rendered at full
// section width anymore). Only handles the common, currently-deployed
// case of exactly 4 confirmed stats; anything else just gets a plain
// "divider before every item but the first," which is still correct,
// just without the cross.
function dividerClass(index: number, total: number) {
  if (total !== 4) {
    return index > 0 ? 'border-s border-[#55684A]/15' : ''
  }
  return [index % 2 === 1 ? 'border-s border-[#55684A]/15' : '', index >= 2 ? 'border-t border-[#55684A]/15' : '']
    .filter(Boolean)
    .join(' ')
}

// Only counters the owner has actually signed off on (confirmed: true) ever
// reach the page - see src/content/site-stats.ts. With nothing confirmed
// yet, this renders nothing at all rather than a strip of zeros or
// placeholder numbers.
export default function StatsSection({ stats, title }: { stats: SiteStat[]; title?: string }) {
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
    const duration = 1600
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

  // 3 confirmed stats reads much better as one clean row than as a 2+1
  // wrap (grid-cols-2 would leave the 3rd item alone on its own line) -
  // dividerClass's existing "border-s on every item but the first"
  // fallback (anything other than the 4-item cross) already produces
  // plain vertical dividers that fit a single row perfectly as-is.
  const colsClass = confirmed.length === 3 ? 'grid-cols-3' : confirmed.length >= 2 ? 'grid-cols-2' : 'grid-cols-1'

  // No own <section>/outer padding - the caller (ArcGallerySection)
  // positions this (inside the desktop arc's circle, or below the mobile
  // carousel) and owns the surrounding spacing. Always compact: this is
  // never rendered at full section width anymore.
  return (
    <div ref={sectionRef} className="arc-stats-strip mx-auto flex w-full max-w-[300px] flex-col items-center text-center">
      {title && (
        <span className="inline-flex rounded-full bg-[#E4ECD6] px-3.5 py-1.5 text-xs font-semibold text-[#34472B]">{title}</span>
      )}
      <div
        className={`arc-stats-card grid w-full gap-x-3 gap-y-4 rounded-[1.75rem] bg-white p-4 shadow-[0_12px_32px_rgba(52,71,43,0.10)] ${
          title ? 'mt-3' : ''
        } ${colsClass}`}
      >
        {confirmed.map((stat, index) => {
          const Icon = STAT_ICONS[index % STAT_ICONS.length]
          return (
            <div key={stat.label} className={`px-1.5 text-center ${dividerClass(index, confirmed.length)}`}>
              <Icon aria-hidden="true" className="mx-auto mb-1.5 size-4 text-[#55684A]/70" strokeWidth={1.75} />
              {/* dir="ltr" so the digits and the "+" sign never get
                  reordered/mirrored by RTL bidi rules. tabular-nums keeps
                  the card from jittering in width as digit counts change
                  mid-animation. aria-label carries the stable final value;
                  the animating digits themselves are aria-hidden so a
                  screen reader never reads a mid-count intermediate. */}
              <p
                className="stat-value tabular-nums text-[2.25rem] font-light leading-none"
                dir="ltr"
                data-counting={counting || undefined}
                aria-label={`${stat.value}+`}
              >
                <span aria-hidden="true">{reducedMotion ? stat.value : values[index]}+</span>
              </p>
              <p
                className="mt-1.5 text-xs leading-snug text-[#34472B]/80 transition-opacity duration-500 ease-out"
                style={{ opacity: started || reducedMotion ? 1 : 0, transitionDelay: started ? '1.3s' : '0s' }}
              >
                {stat.label}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

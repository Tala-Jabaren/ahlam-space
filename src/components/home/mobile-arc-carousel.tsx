'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import Image from 'next/image'
import type { ArcGalleryPhoto } from './arc-gallery-section'

// CSS alone (animation-timeline: view(inline)) turned out unreliable here:
// tested in a real RTL scroll container, the card the animation marked as
// "focused" (scale 1) was never the one actually centered in the
// viewport - a real mismatch, not a timing issue (confirmed with both an
// instant jump and a smooth scroll, both settled, both wrong). This is
// still "no JS library" per the brief - just a small scroll listener
// measuring real card positions, which can't be wrong the way a
// scroll-timeline heuristic can.
export default function MobileArcCarousel({ photos, eyebrow }: { photos: ArcGalleryPhoto[]; eyebrow: string }) {
  const scrollerRef = useRef<HTMLUListElement>(null)

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
    const el = scrollerRef.current
    if (!el) return
    const cards = Array.from(el.querySelectorAll<HTMLElement>('[data-carousel-card]'))
    let raf = 0

    function updateActive() {
      if (!el) return
      const center = el.getBoundingClientRect().left + el.getBoundingClientRect().width / 2
      let closest: HTMLElement | null = null
      let closestDist = Infinity
      for (const card of cards) {
        const r = card.getBoundingClientRect()
        const dist = Math.abs(r.left + r.width / 2 - center)
        if (dist < closestDist) {
          closestDist = dist
          closest = card
        }
      }
      for (const card of cards) card.classList.toggle('is-active', card === closest)
    }

    function onScroll() {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(updateActive)
    }

    updateActive()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <ul ref={scrollerRef} className="arc-carousel" role="list" aria-label={eyebrow} data-reduced-motion={reducedMotion || undefined}>
      {photos.map((photo, index) => (
        <li
          key={photo.src}
          data-carousel-card
          className="arc-carousel-card"
          style={{ '--tilt': index % 2 === 0 ? '-3.5deg' : '3.5deg' } as React.CSSProperties}
          tabIndex={0}
        >
          <Image src={photo.src} alt={photo.alt} width={340} height={425} loading="lazy" className="size-full object-cover" />
        </li>
      ))}
    </ul>
  )
}

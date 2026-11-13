'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import rhythm from '@/components/layout/page-rhythm.module.css'

// The home page's hero is full-bleed and sits behind the header itself
// (SiteHeader goes transparent there), so <main> must not reserve any
// space for the header on that one page - every other page still needs
// the usual clearance for the floating pill header, which is always
// position: fixed and so never reserves its own space in normal flow.
//
// This used to be done with a negative margin on the hero section
// instead, which was fragile: the hero isn't a direct child of <main> -
// it's nested inside page.tsx's own wrapping div, and that div's
// overflow-hidden clips anything a negative margin pushes above ITS OWN
// box, before it ever reaches <main>'s padding. A route check here is
// simpler and doesn't depend on exactly what markup sits between <main>
// and the hero.
export default function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isHome = pathname === '/'
  const main = useRef<HTMLElement>(null)
  useEffect(() => {
    if (isHome) return
    const header = document.querySelector<HTMLElement>('.site-header')
    const content = main.current
    if (!header || !content) return
    function measure() {
      // Fixed header: 16px top inset, its wrapped height, then 24px entry gap.
      content!.style.setProperty('--public-header-clearance', `${Math.ceil(header!.getBoundingClientRect().height) + 40}px`)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(header)
    return () => {
      observer.disconnect()
      content.style.removeProperty('--public-header-clearance')
    }
  }, [isHome])
  return <main ref={main} className={isHome ? '' : rhythm.publicEntry}>{children}</main>
}

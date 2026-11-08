'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { LanguageSwitcher } from '@/i18n/language-switcher'
import PublicNavLink from './public-nav-link'
import CartNavLink from './cart-nav-link'
import type { Dictionary } from '@/i18n/dictionaries'
import type { Locale } from '@/i18n/config'

// Floating translucent pill header: gets a shadow after a short scroll,
// hides on scroll-down and returns on scroll-up (a small passive
// listener - this is persistent chrome behavior, not a one-shot
// scroll-position reveal, so it's plain JS rather than a view-timeline).
// Never hides while anything inside it has focus - handled purely in CSS
// via :focus-within (see .site-header in globals.css), not JS, so it
// can't drift out of sync with real focus state.
export default function SiteHeader({
  user,
  t,
  locale,
}: {
  user: boolean
  t: Dictionary
  locale: Locale
}) {
  const [hidden, setHidden] = useState(false)
  const [shadow, setShadow] = useState(false)
  const lastY = useRef(0)

  useEffect(() => {
    lastY.current = window.scrollY

    function onScroll() {
      const y = window.scrollY
      const goingDown = y > lastY.current
      setShadow(y > 40)
      // Never hide near the very top - avoids a jittery hide on the
      // first small scroll right after the page loads.
      setHidden(y > 120 && goingDown)
      lastY.current = y
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="fixed inset-x-4 top-4 z-50 mx-auto max-w-6xl sm:inset-x-6 lg:inset-x-10">
      <nav
        dir="ltr"
        data-hidden={hidden || undefined}
        data-shadow={shadow || undefined}
        className="site-header flex flex-col gap-5 rounded-[1.75rem] border border-[#55684A]/10 bg-[#F6F5EE]/85 px-5 py-4 backdrop-blur-md lg:flex-row lg:items-center lg:justify-between lg:px-8"
      >
        <Link href="/" className="font-serif text-2xl tracking-wide text-[#55684A]">
          Ahlam Space
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div
            dir={locale === 'ar' ? 'rtl' : 'ltr'}
            className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-medium uppercase tracking-[0.18em] text-[#55684A]"
          >
            <PublicNavLink href="/">{t.nav.home}</PublicNavLink>
            <PublicNavLink href="/about">{t.nav.about}</PublicNavLink>
            <PublicNavLink href="/classes">{t.nav.classes}</PublicNavLink>
            <PublicNavLink href="/courses">{t.nav.courses}</PublicNavLink>
            <PublicNavLink href="/private-sessions">{t.nav.privateSessions}</PublicNavLink>
            <PublicNavLink href="/shop">{t.nav.shop}</PublicNavLink>
            <PublicNavLink href="/journeys">{t.nav.journeys}</PublicNavLink>
            <PublicNavLink href="/contact">{t.nav.contact}</PublicNavLink>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <CartNavLink />
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#55684A] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#34472B]"
              href={user ? '/member-schedule' : '/login'}
            >
              {user ? t.nav.account : t.nav.login}
            </Link>
          </div>
        </div>
      </nav>
    </div>
  )
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Menu } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { LanguageSwitcher } from '@/i18n/language-switcher'
import PublicNavLink from './public-nav-link'
import CartNavLink from './cart-nav-link'
import MobileNavigation, { MOBILE_MENU_ID } from './mobile-navigation'
import { mobileNavigationCopy } from './mobile-navigation-copy'
import styles from './site-header.module.css'
import type { Dictionary } from '@/i18n/dictionaries'
import type { Locale } from '@/i18n/config'

// Floating translucent pill header: gets a shadow after a short scroll,
// hides on scroll-down and returns on scroll-up (a small passive
// listener - this is persistent chrome behavior, not a one-shot
// scroll-position reveal, so it's plain JS rather than a view-timeline).
// Never hides while anything inside it has focus - handled purely in CSS
// via :focus-within (see .site-header in globals.css), not JS, so it
// can't drift out of sync with real focus state.
//
// On the home page specifically, it starts fully transparent (no bar, no
// border, white text) sitting right on top of the hero photo, and
// switches to the normal floating pill the moment it would get a shadow
// (>40px scrolled) - same threshold, so the two happen together. Every
// other page just gets the pill from the start, since they have no hero
// photo for a transparent header to sit on.
export default function SiteHeader({
  user,
  userName,
  t,
  locale,
}: {
  user: boolean
  userName?: string | null
  t: Dictionary
  locale: Locale
}) {
  const pathname = usePathname()
  const isHome = pathname === '/'
  const [hidden, setHidden] = useState(false)
  const [shadow, setShadow] = useState(false)
  const lastY = useRef(0)
  const hamburger = useRef<HTMLButtonElement>(null)
  const [menuPath, setMenuPath] = useState<string | null>(null)
  const menuOpen = menuPath === pathname
  const closeMenu = useCallback(() => setMenuPath(null), [])
  const mobileCopy = mobileNavigationCopy(locale)

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

  const transparent = isHome && !shadow

  return (
    <>
      <div
        data-transparent={transparent}
        className={`${styles.frame} ${
          transparent
            ? 'fixed inset-x-0 top-0 z-50'
            : 'fixed inset-x-4 top-4 z-50 mx-auto max-w-6xl sm:inset-x-6 lg:inset-x-10'
        }`}
      >
        <nav
          dir="ltr"
          data-locale={locale}
          data-hidden={hidden || undefined}
          data-shadow={shadow || undefined}
          className={`${styles.bar} ${
            transparent
              ? 'site-header flex flex-col gap-5 border border-transparent bg-transparent px-5 py-5 text-white sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10'
              : 'site-header flex flex-col gap-5 rounded-[1.75rem] border border-[#55684A]/10 bg-[#F6F5EE]/85 px-5 py-4 text-[#55684A] backdrop-blur-md lg:flex-row lg:items-center lg:justify-between lg:px-8'
          }`}
        >
          <Link href="/" className={`${styles.barLogo} font-serif text-2xl tracking-wide ${transparent ? 'text-white' : 'text-[#55684A]'}`}>
            Ahlam Space
          </Link>
          <div className={`${styles.desktopLinks} flex flex-col gap-4 lg:flex-row lg:items-center`}>
            <div
              dir={locale === 'ar' ? 'rtl' : 'ltr'}
              className={`flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-medium uppercase tracking-[0.18em] ${
                transparent ? 'text-white' : 'text-[#55684A]'
              }`}
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
              <LanguageSwitcher
                className={
                  transparent
                    ? 'inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-white/30 text-white transition hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
                    : undefined
                }
              />
              <CartNavLink iconClassName={transparent ? 'size-6 text-white' : 'size-6 text-[#617A55]'} />
              <Link
                className={`${styles.headerAccount} min-h-11 px-6 py-3 text-sm shadow-sm`}
                href={user ? '/member-schedule' : '/login'}
              >
                {user ? t.nav.account : t.nav.login}
              </Link>
            </div>
          </div>
          <div className={styles.mobileControls}>
            <Link className={styles.headerAccount} href={user ? '/member-schedule' : '/login'}>
              {user ? t.nav.account : t.nav.login}
            </Link>
            <CartNavLink iconClassName={transparent ? 'size-6 text-white' : 'size-6 text-[#617A55]'} />
            <button
              ref={hamburger}
              type="button"
              aria-label={mobileCopy.open}
              aria-expanded={menuOpen}
              aria-controls={MOBILE_MENU_ID}
              className={styles.iconButton}
              onClick={() => setMenuPath(pathname)}
            >
              <Menu aria-hidden="true" size={23} strokeWidth={1.75} />
            </button>
          </div>
        </nav>
      </div>
      <MobileNavigation open={menuOpen} onClose={closeMenu} trigger={hamburger} user={user} userName={userName} />
    </>
  )
}

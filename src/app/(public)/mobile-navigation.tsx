'use client'

import { useEffect, useRef, type CSSProperties, type RefObject } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, CalendarDays, Flower2, House, Info, Mail, Map, ShoppingBag, UserRound, X } from 'lucide-react'
import { useT } from '@/i18n/i18n-context'
import { mobileNavigationCopy } from './mobile-navigation-copy'
import styles from './site-header.module.css'

export const MOBILE_MENU_ID = 'public-mobile-navigation'

export default function MobileNavigation({
  open,
  onClose,
  trigger,
  user,
  userName,
}: {
  open: boolean
  onClose: () => void
  trigger: RefObject<HTMLButtonElement | null>
  user: boolean
  userName?: string | null
}) {
  const { t, locale, dir, setLocale } = useT()
  const pathname = usePathname()
  const dialog = useRef<HTMLDialogElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const copy = mobileNavigationCopy(locale)
  const groups = [
    [
      { href: '/', label: t.nav.home, icon: House },
      { href: '/about', label: t.nav.about, icon: Info },
      { href: '/classes', label: t.nav.classes, icon: CalendarDays },
      { href: '/private-sessions', label: t.nav.privateSessions, icon: Flower2 },
      { href: '/courses', label: t.nav.courses, icon: BookOpen },
    ],
    [
      { href: '/journeys', label: t.nav.journeys, icon: Map },
      { href: '/shop', label: t.nav.shop, icon: ShoppingBag },
    ],
    [
      { href: '/contact', label: t.nav.contact, icon: Mail },
    ],
  ]

  useEffect(() => {
    if (!open) return
    const element = dialog.current
    if (!element) return
    const hamburger = trigger.current
    const root = document.documentElement
    const body = document.body
    const oldOverflow = root.style.overflow
    const oldGutter = root.style.scrollbarGutter
    const oldBodyOverflow = body.style.overflow
    const oldPadding = body.style.paddingInlineEnd
    const gap = window.innerWidth - root.clientWidth

    // Stable root gutter also protects fixed elements from shifting when the
    // scrollbar disappears. The padding fallback is for older browsers.
    if (gap > 0) {
      if (CSS.supports('scrollbar-gutter', 'stable')) root.style.scrollbarGutter = 'stable'
      else body.style.paddingInlineEnd = `${parseFloat(getComputedStyle(body).paddingInlineEnd) + gap}px`
    }
    root.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    element.showModal()
    closeButton.current?.focus({ preventScroll: true })

    const desktop = window.matchMedia('(min-width: 1024px)')
    function closeOnDesktop(event: MediaQueryListEvent) {
      if (event.matches) onClose()
    }
    desktop.addEventListener('change', closeOnDesktop)

    return () => {
      desktop.removeEventListener('change', closeOnDesktop)
      if (element.open) element.close()
      root.style.overflow = oldOverflow
      root.style.scrollbarGutter = oldGutter
      body.style.overflow = oldBodyOverflow
      body.style.paddingInlineEnd = oldPadding
      if (!desktop.matches && hamburger?.isConnected) hamburger.focus({ preventScroll: true })
    }
  }, [open, onClose, trigger])

  let itemIndex = 0
  const displayName = userName?.trim() || t.nav.account
  const initials = displayName.split(/\s+/u).slice(0, 2).map((part) => Array.from(part)[0]).join('')

  return (
    <dialog
      id={MOBILE_MENU_ID}
      ref={dialog}
      dir={dir}
      className={styles.drawer}
      aria-modal="true"
      aria-labelledby="mobile-navigation-title"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const box = event.currentTarget.getBoundingClientRect()
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose()
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const targets = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), [tabindex="0"]'))
          .filter((element) => element.getClientRects().length > 0)
        const first = targets[0]
        const last = targets.at(-1)
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }}
    >
      <div className={styles.drawerHeader}>
        <Link href="/" className={styles.wordmark} onClick={onClose}>Ahlam Space</Link>
        <h2 id="mobile-navigation-title" className="sr-only">{copy.navigation}</h2>
        <button ref={closeButton} type="button" className={styles.iconButton} aria-label={copy.close} onClick={onClose}>
          <X aria-hidden="true" size={22} />
        </button>
      </div>

      <div className={styles.drawerBody}>
        <nav aria-label={copy.navigation}>
          {groups.map((group, groupIndex) => (
            <ul key={groupIndex} className={styles.linkGroup}>
              {group.map(({ href, label, icon: Icon }) => {
                const active = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
                const index = itemIndex++
                return (
                  <li key={href} className={styles.menuItem} style={{ '--item-index': index } as CSSProperties}>
                    <Link href={href} className={styles.menuLink} aria-current={active ? 'page' : undefined} onClick={onClose}>
                      <Icon aria-hidden="true" size={20} strokeWidth={1.65} />
                      <span>{label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          ))}
        </nav>

        <div className={styles.languageSection}>
          <p id="mobile-language-label" className={styles.sectionLabel}>{copy.language}</p>
          <div className={styles.languageToggle} role="group" aria-labelledby="mobile-language-label" dir="ltr" data-locale={locale}>
            <span aria-hidden="true" className={styles.languageHighlight} />
            <button type="button" lang="ar" aria-pressed={locale === 'ar'} onClick={() => setLocale('ar')}>عربي</button>
            <button type="button" lang="en" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>EN</button>
          </div>
        </div>
      </div>

      <div className={styles.accountSection}>
        {user ? (
          <Link href="/member-schedule" className={styles.profileLink} onClick={onClose}>
            <span className={styles.avatar} aria-hidden="true">{initials || <UserRound size={22} />}</span>
            <span className="min-w-0">
              <span className={styles.profileName} dir="auto">{displayName}</span>
              <span className={styles.profileLabel}>{t.nav.account}</span>
            </span>
          </Link>
        ) : (
          <>
            <Link href="/login" className={styles.loginButton} onClick={onClose}>{t.nav.login}</Link>
            <Link href="/sign-up" className={styles.signUpLink} onClick={onClose}>{copy.signUp}</Link>
          </>
        )}
      </div>
    </dialog>
  )
}

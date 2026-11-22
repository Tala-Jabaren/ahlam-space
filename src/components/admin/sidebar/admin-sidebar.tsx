'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import NotificationBadge from '@/components/admin/notifications/notification-badge'
import type { AdminNotificationCounts } from '@/lib/admin-notification-links'
import { usePathname } from 'next/navigation'
import { ArrowUpRight, BookOpen, CalendarDays, Compass, Flower2, House, LogOut, MoreHorizontal, MessageSquare, Package, ShieldCheck, ShoppingBag, Users, WalletCards, X, type LucideIcon } from 'lucide-react'
import { adminNavGroups, adminNavItems, type AdminNavIcon, type AdminNavItem } from '@/app/(admin)/admin/admin-nav'
import LogoutButton from '@/app/(member)/dashboard/logout-button'
import { dirFor, type Locale } from '@/i18n/config'
import { adminSidebarCopy } from '@/i18n/admin-sidebar'
import { createClient } from '@/lib/supabase/client'
import rhythm from '@/components/layout/page-rhythm.module.css'
import styles from './admin-sidebar.module.css'

const drawerId = 'admin-sidebar-drawer'
const titleId = 'admin-sidebar-drawer-title'
const icons: Record<AdminNavIcon, LucideIcon> = {
  home: House, calendar: CalendarDays, flower: Flower2, book: BookOpen,
  compass: Compass, shop: ShoppingBag, package: Package, wallet: WalletCards,
  users: Users, reviews: MessageSquare, shield: ShieldCheck,
}

function revealCurrentLink(container: HTMLElement) {
  if (!container.clientHeight) return
  const selected = container.querySelector<HTMLElement>('[aria-current="page"]')
  if (!selected) return
  const item = selected.getBoundingClientRect()
  const area = container.getBoundingClientRect()
  if (item.top < area.top + 4) container.scrollTop += item.top - area.top - 4
  else if (item.bottom > area.bottom - 4) container.scrollTop += item.bottom - area.bottom + 4
}

function SidebarPanel({ locale, pathname, name, notificationCounts, onNavigate, closeButton, navigationItems }: {
  locale: Locale
  pathname: string
  name: string
  notificationCounts: AdminNotificationCounts
  onNavigate: () => void
  closeButton?: React.ReactNode
  navigationItems: readonly AdminNavItem[]
}) {
  const copy = adminSidebarCopy[locale]
  const navigation = useRef<HTMLElement>(null)
  const initials = name.split(/\s+/u).slice(0, 2).map(part => Array.from(part)[0]).join('').toLocaleUpperCase(locale)

  useEffect(() => {
    const container = navigation.current
    if (!container) return
    const reveal = () => revealCurrentLink(container)
    reveal()
    const observer = new ResizeObserver(reveal)
    observer.observe(container)
    return () => observer.disconnect()
  }, [pathname])

  return <>
    <div className={styles.panelHeader}>
      <Link href="/admin" className={styles.brand} onClick={onNavigate}>
        <span className={styles.wordmark}>Ahlam Space</span>
        <span className={styles.adminLabel}>{copy.title}</span>
      </Link>
      {closeButton}
    </div>
    <nav ref={navigation} className={styles.navigation} aria-label={copy.navigation}>
      {adminNavGroups.filter(group => navigationItems.some(item => item.group === group.id)).map(group => <section key={group.id} className={styles.group}>
        <p className={styles.groupLabel}>{group.label[locale]}</p>
        <ul>
          {navigationItems.filter(item => item.group === group.id).map(item => {
            const Icon = icons[item.icon]
            const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(`${item.href}/`))
            const index = navigationItems.indexOf(item)
            return <li key={item.href} className={styles.navItem} style={{ '--item-index': index } as CSSProperties}>
              <Link href={item.href} className={styles.navLink} aria-current={active ? 'page' : undefined} onClick={onNavigate}>
                <Icon size={20} strokeWidth={1.6} aria-hidden="true" />
                <span>{item.label[locale]}</span>
                {item.notificationKind && <NotificationBadge count={notificationCounts[item.notificationKind]} locale={locale} />}
              </Link>
            </li>
          })}
        </ul>
      </section>)}
    </nav>
    <div className={styles.account}>
      <div className={styles.profile}>
        <span className={styles.avatar} aria-hidden="true">{initials}</span>
        <div className={styles.profileText}>
          <span className={styles.name} dir="auto" title={name}>{name}</span>
          <span className={styles.role}>{copy.administrator}</span>
        </div>
      </div>
      <Link href="/" className={styles.backLink} onClick={onNavigate}>
        <ArrowUpRight size={20} strokeWidth={1.6} className={styles.backIcon} aria-hidden="true" />
        {copy.backToSite}
      </Link>
      <div className={`${styles.logout} ${locale === 'en' ? styles.englishLogout : ''}`}>
        {locale === 'en' && <LogOut size={20} strokeWidth={1.6} className={styles.logoutIcon} aria-hidden="true" />}
        <LogoutButton variant={locale === 'ar' ? 'sidebar' : 'default'} />
      </div>
    </div>
  </>
}

export default function AdminSidebar({ locale, notificationCounts, isPrimaryAdmin, children }: {
  locale: Locale
  notificationCounts: AdminNotificationCounts
  isPrimaryAdmin: boolean
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const copy = adminSidebarCopy[locale]
  const dir = dirFor(locale)
  const [openedAt, setOpenedAt] = useState<string | null>(null)
  const [adminName, setAdminName] = useState<string | null>(null)
  const open = openedAt !== null && openedAt === pathname
  const close = useCallback(() => setOpenedAt(null), [])
  const trigger = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const closeControl = useRef<HTMLButtonElement>(null)
  const displayName = adminName || copy.administrator
  const visibleItems = adminNavItems.filter(item => !item.primaryAdminOnly || isPrimaryAdmin)
  const primaryItems = visibleItems.filter(item => item.mobilePrimary)
  const moreItems = visibleItems.filter(item => !item.mobilePrimary)
  const moreActive = moreItems.some(item => pathname === item.href || pathname.startsWith(`${item.href}/`))
  const moreCount = moreItems.reduce((sum, item) => sum + (item.notificationKind ? notificationCounts[item.notificationKind] : 0), 0)

  useEffect(() => {
    let alive = true
    async function loadDisplayName() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
      const metadata = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : null
      if (alive) setAdminName(profile?.full_name?.trim() || metadata || user.email || null)
    }
    // Name display is optional; the server layout still performs every role check.
    void loadDisplayName().catch(() => {})
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!open) return
    const element = dialog.current
    if (!element) return
    const hamburger = trigger.current
    const root = document.documentElement
    const body = document.body
    const previous = { overflow: root.style.overflow, gutter: root.style.scrollbarGutter, bodyOverflow: body.style.overflow, padding: body.style.paddingInlineEnd }
    const gap = window.innerWidth - root.clientWidth
    if (gap > 0) {
      if (CSS.supports('scrollbar-gutter', 'stable')) root.style.scrollbarGutter = 'stable'
      else body.style.paddingInlineEnd = `${parseFloat(getComputedStyle(body).paddingInlineEnd) + gap}px`
    }
    root.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    element.showModal()
    closeControl.current?.focus({ preventScroll: true })
    const nav = element.querySelector<HTMLElement>('nav')
    if (nav) revealCurrentLink(nav)
    const desktop = window.matchMedia('(min-width: 1024px)')
    const onResize = (event: MediaQueryListEvent) => { if (event.matches) close() }
    desktop.addEventListener('change', onResize)
    return () => {
      desktop.removeEventListener('change', onResize)
      if (element.open) element.close()
      root.style.overflow = previous.overflow
      root.style.scrollbarGutter = previous.gutter
      body.style.overflow = previous.bodyOverflow
      body.style.paddingInlineEnd = previous.padding
      if (!desktop.matches && hamburger?.isConnected) hamburger.focus({ preventScroll: true })
    }
  }, [open, close])

  return <div className={styles.shell} dir={dir}>
    <aside className={styles.desktopSidebar}>
      <SidebarPanel locale={locale} pathname={pathname} name={displayName} notificationCounts={notificationCounts} onNavigate={close} navigationItems={visibleItems} />
    </aside>
    <header className={styles.topbar}>
      <Link href="/admin" className={styles.topbarBrand}>
        <span className={styles.wordmark}>Ahlam Space</span>
        <span className={styles.adminLabel}>{copy.title}</span>
      </Link>
      <span className={styles.headerAvatar} title={displayName} aria-hidden="true">{Array.from(displayName.trim())[0]}</span>
    </header>
    <div className={`${styles.content} ${rhythm.adminEntry}`}>{children}</div>
    <nav className={styles.bottomNav} aria-label={copy.mobileNavigation}>
      {primaryItems.map(item => {
        const Icon = icons[item.icon]
        const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(`${item.href}/`))
        return <Link key={item.href} href={item.href} onClick={close} className={styles.bottomItem} aria-current={active ? 'page' : undefined}>
          <span className={styles.bottomIcon}><Icon size={21} strokeWidth={1.7} aria-hidden="true" />{item.notificationKind && <span className={styles.bottomBadge}><NotificationBadge count={notificationCounts[item.notificationKind]} locale={locale} /></span>}</span>
          <span>{item.label[locale]}</span>
        </Link>
      })}
      <button ref={trigger} type="button" className={styles.bottomItem} data-active={open || moreActive} aria-label={`${copy.openMore}${moreCount > 0 ? `، ${new Intl.NumberFormat(locale).format(moreCount)} ${copy.notifications}` : ''}`} aria-expanded={open} aria-controls={drawerId} aria-haspopup="dialog" onClick={() => setOpenedAt(pathname)}>
        <span className={styles.bottomIcon}><MoreHorizontal size={22} aria-hidden="true" /><span className={styles.bottomBadge}><NotificationBadge count={moreCount} locale={locale} /></span></span>
        <span>{copy.more}</span>
      </button>
    </nav>
    <dialog ref={dialog} id={drawerId} dir={dir} className={styles.drawer} aria-modal="true" aria-labelledby={titleId}
      onClose={close}
      onCancel={event => { event.preventDefault(); close() }}
      onClick={event => {
        if (event.target !== event.currentTarget) return
        const box = event.currentTarget.getBoundingClientRect()
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close()
      }}
      onKeyDown={event => {
        if (event.key !== 'Tab') return
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),[tabindex="0"]')).filter(element => element.getClientRects().length > 0)
        const first = controls[0], last = controls.at(-1)
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }}>
      <h2 id={titleId} className="sr-only">{copy.navigation}</h2>
      <SidebarPanel locale={locale} pathname={pathname} name={displayName} notificationCounts={notificationCounts} onNavigate={close} navigationItems={moreItems} closeButton={
        <button ref={closeControl} type="button" className={styles.iconButton} aria-label={copy.closeMore} onClick={close}>
          <X size={22} aria-hidden="true" />
        </button>
      } />
    </dialog>
  </div>
}

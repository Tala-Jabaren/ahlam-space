import Link from 'next/link'
import FloatingWhatsApp from '@/components/contact/floating-whatsapp'
import { WHATSAPP_URL } from '@/content/site-contact'
import { ArrowUpRight, BookOpen, CalendarDays, Compass, Flower2, House, ShieldCheck, ShoppingBag, Ticket, UserRound } from 'lucide-react'
import { getMemberSession } from '@/lib/member-session'
import LogoutButton from './dashboard/logout-button'
import MemberNavLink from './member-nav-link'
import { getT } from '@/i18n/get-t'
import { I18nProvider } from '@/i18n/i18n-context'
import { checkoutAr } from '@/i18n/checkout-ar'
import { ExperienceProvider } from '@/components/commerce/experience-provider'
import MemberCartLink from '@/components/commerce/member-cart-link'
import CartBottomBar from '@/app/(public)/cart-bottom-bar'
import { memberRoutes } from '@/lib/experience-routes'
import rhythm from '@/components/layout/page-rhythm.module.css'

const navItems = [
  // Packages live as a tab inside /member-schedule (alongside classes),
  // not as their own nav item - see src/app/(member)/member-schedule/page.tsx.
  { href: '/member-schedule', label: 'الحصص', icon: <CalendarDays strokeWidth={1.5} /> },
  { href: '/member/private-sessions', label: 'الجلسات الفردية', mobileLabel: 'فردية', icon: <Flower2 strokeWidth={1.5} /> },
  { href: '/bookings', label: 'حجوزاتي', icon: <Ticket strokeWidth={1.5} /> },
  { href: memberRoutes.courses, label: 'محاضراتي', icon: <BookOpen strokeWidth={1.5} /> },
  { href: '/trips', label: 'المشاوير', icon: <Compass strokeWidth={1.5} /> },
  { href: memberRoutes.shop, label: 'المتجر', icon: <ShoppingBag strokeWidth={1.5} /> },
  { href: '/account', label: 'حسابي', icon: <UserRound strokeWidth={1.5} /> },
]

const adminNavItem = {
  href: '/admin',
  label: 'لوحة الإدارة',
  icon: <ShieldCheck strokeWidth={1.5} />,
}

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { supabase, user } = await getMemberSession()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .maybeSingle()

  const fullName = profile?.full_name?.trim() || user.email || 'عضوة'
  const isAdmin = profile?.role === 'admin'
  const { t, locale } = await getT()
  const backToSite = (t.checkout ?? checkoutAr).auth.backToSite

  return (
    <I18nProvider locale={locale} dictionary={t}>
    <ExperienceProvider routes={memberRoutes}>
    <div className="min-h-screen bg-[#F7F6F0] text-[#617A55]" dir="rtl">
      <aside className="fixed inset-y-0 end-0 z-40 hidden w-72 flex-col overflow-y-auto border-s border-[#617A55]/15 bg-[#F7F6F0] px-6 py-7 md:flex">
        <Link
          href="/"
          className="block border-b border-[#617A55]/15 pb-7 text-center"
        >
          <span className="block font-serif text-3xl text-[#617A55]">
            Ahlam
          </span>
          <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.38em] text-[#617A55]">
            Space
          </span>
        </Link>

        <nav className="mt-7 grid gap-2" aria-label="تنقل حساب العضو">
          {navItems.map((item) => (
            <MemberNavLink
              key={item.href}
              {...item}
            />
          ))}
          {isAdmin && <MemberNavLink {...adminNavItem} />}
        </nav>

        <div className="mt-auto border-t border-[#617A55]/15 pt-5">
          <Link
            href="/"
            className="mb-2 inline-flex min-h-11 items-center gap-2 px-4 text-sm font-medium text-[#617A55]/75 transition hover:text-[#617A55]"
          >
            <ArrowUpRight aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.5} />
            {backToSite}
          </Link>
          <LogoutButton variant="sidebar" />
        </div>
      </aside>

      <div className="min-h-screen pb-24 md:pb-0 md:pe-72">
        <header className="sticky top-0 z-30 border-b border-[#617A55]/15 bg-[#F7F6F0]/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/account"
              title={fullName}
              className="inline-flex min-h-11 min-w-0 max-w-xs items-center gap-2 rounded-full bg-[var(--blue-soft)] ps-2 pe-4 text-sm font-semibold text-[var(--blue-deep)] transition-colors hover:bg-[var(--blue-mist)] focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#F7F6F0]">
                <UserRound aria-hidden="true" size={19} strokeWidth={1.75} />
              </span>
              <bdi className="truncate">{fullName}</bdi>
            </Link>
            <MemberCartLink />
            <Link
              href="/"
              className="ms-auto inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-[#617A55]/25 px-2.5 text-xs font-semibold text-[#465d3d] hover:bg-[#D6E2B6]/50 focus-visible:outline-2 focus-visible:outline-offset-2 sm:px-3 md:hidden"
            >
              <House aria-hidden="true" size={16} />
              {backToSite}
            </Link>
          </div>
        </header>

        <div className={rhythm.memberEntry}>{children}</div>
      </div>

      <nav
        className={`fixed inset-x-0 bottom-0 z-50 grid ${isAdmin ? 'grid-cols-[repeat(8,minmax(2.75rem,1fr))] overflow-x-auto' : 'grid-cols-7'} border-t border-[#617A55]/15 bg-[#F7F6F0]/95 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden`}
        aria-label="تنقل الجوال"
      >
        {navItems.map((item) => (
          <MemberNavLink
            key={item.href}
            {...item}
            mobile
          />
        ))}
        {isAdmin && <MemberNavLink {...adminNavItem} label="الإدارة" mobile />}
      </nav>
      <CartBottomBar member />
      <FloatingWhatsApp href={WHATSAPP_URL} member />
    </div>
    </ExperienceProvider>
    </I18nProvider>
  )
}

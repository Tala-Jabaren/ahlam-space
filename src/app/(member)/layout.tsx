import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowUpRight, BookOpen, CalendarDays, CircleHelp, Compass, Package, ShoppingBag, Ticket, UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from './dashboard/logout-button'
import MemberNavLink from './member-nav-link'
import { getT } from '@/i18n/get-t'
import { I18nProvider } from '@/i18n/i18n-context'
import { ExperienceProvider } from '@/components/commerce/experience-provider'
import MemberCartLink from '@/components/commerce/member-cart-link'
import CartBottomBar from '@/app/(public)/cart-bottom-bar'
import { memberRoutes } from '@/lib/experience-routes'
import rhythm from '@/components/layout/page-rhythm.module.css'

const navItems = [
  { href: '/member-schedule', label: 'الحصص', icon: <CalendarDays strokeWidth={1.5} /> },
  { href: '/bookings', label: 'حجوزاتي', icon: <Ticket strokeWidth={1.5} /> },
  { href: '/orders', label: 'طلباتي', icon: <Package strokeWidth={1.5} /> },
  { href: memberRoutes.courses, label: 'محاضراتي', icon: <BookOpen strokeWidth={1.5} /> },
  { href: '/trips', label: 'المشاوير', icon: <Compass strokeWidth={1.5} /> },
  { href: memberRoutes.shop, label: 'المتجر', icon: <ShoppingBag strokeWidth={1.5} /> },
  { href: '/account', label: 'حسابي', icon: <UserRound strokeWidth={1.5} /> },
]

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  const fullName = profile?.full_name?.trim() || user.email || 'عضوة'
  const avatarLetter = fullName.charAt(0).toLocaleUpperCase('ar')
  const { t, locale } = await getT()

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
        </nav>

        <div className="mt-auto border-t border-[#617A55]/15 pt-5">
          <Link
            href="/"
            className="mb-2 inline-flex min-h-11 items-center gap-2 px-4 text-sm font-medium text-[#617A55]/75 transition hover:text-[#617A55]"
          >
            <ArrowUpRight aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.5} />
            العودة للموقع
          </Link>
          <Link
            href="/contact"
            className="flex min-h-12 items-center gap-4 rounded-lg px-4 font-medium transition hover:bg-[#C7D6E8]/60"
          >
            <span aria-hidden="true" className="grid size-7 place-items-center">
              <CircleHelp className="size-6" strokeWidth={1.5} />
            </span>
            المساعدة
          </Link>
          <LogoutButton variant="sidebar" />

          <div className="mt-6 overflow-hidden rounded-lg bg-[#D6E2B6]/55 p-5 text-center">
            <div aria-hidden="true" className="mx-auto mb-3 flex justify-center">
              <span className="block h-12 w-7 -rotate-12 rounded-[100%_0_100%_0] bg-[#617A55]/70" />
              <span className="-ms-1 mt-6 block h-9 w-5 rotate-12 rounded-[0_100%_0_100%] bg-[#617A55]/45" />
            </div>
            <p className="font-serif text-lg">هدوء · حركة · توازن</p>
          </div>
        </div>
      </aside>

      <div className="min-h-screen pb-24 md:pb-0 md:pe-72">
        <header className="sticky top-0 z-30 border-b border-[#617A55]/15 bg-[#F7F6F0]/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center gap-3" dir="ltr">
            <label className="relative min-w-0 flex-1 sm:max-w-md">
              <span className="sr-only">البحث</span>
              <span
                aria-hidden="true"
                className="absolute start-4 top-1/2 -translate-y-1/2 text-xl"
              >
                ⌕
              </span>
              <input
                type="search"
                placeholder="ابحثي عن حصة أو يوم..."
                className="min-h-12 w-full rounded-lg border border-[#617A55]/10 bg-[#C7D6E8]/30 px-4 pe-11 text-start text-sm text-[#617A55] outline-none placeholder:text-[#617A55]/65 focus:border-[#617A55]/40"
                dir="rtl"
              />
            </label>

            <MemberCartLink />
            <div className="ms-auto flex min-w-0 items-center gap-3" dir="rtl">
              <div className="grid size-11 shrink-0 place-items-center rounded-full bg-[#617A55] font-serif text-lg text-[#F7F6F0]">
                {avatarLetter}
              </div>
              <div className="hidden min-w-0 text-start sm:block">
                <p className="truncate text-sm font-semibold text-[#617A55]">
                  {fullName}
                </p>
                <p className="text-xs text-[#617A55]/70">Member</p>
              </div>
            </div>
          </div>
        </header>

        <div className={rhythm.memberEntry}>{children}</div>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-7 border-t border-[#617A55]/15 bg-[#F7F6F0]/95 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden"
        aria-label="تنقل الجوال"
      >
        {navItems.map((item) => (
          <MemberNavLink
            key={item.href}
            {...item}
            mobile
          />
        ))}
      </nav>
      <CartBottomBar member />
    </div>
    </ExperienceProvider>
    </I18nProvider>
  )
}

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getT } from '@/i18n/get-t'
import { I18nProvider } from '@/i18n/i18n-context'
import { LanguageSwitcher } from '@/i18n/language-switcher'
import PublicNavLink from './public-nav-link'
import CartNavLink from './cart-nav-link'
import CartBottomBar from './cart-bottom-bar'

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { t, locale } = await getT()

  return (
    <I18nProvider locale={locale} dictionary={t}>
      <div className="min-h-screen bg-[#F7F6F0] text-[#25311f]">
        <nav className="sticky top-0 z-50 mx-auto flex max-w-7xl flex-col gap-5 border-b border-[#617A55]/15 bg-[#F7F6F0]/90 px-5 py-5 backdrop-blur sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <Link
            href="/"
            className="font-serif text-2xl tracking-wide text-[#617A55]"
          >
            Ahlam Space
          </Link>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-medium uppercase tracking-[0.18em] text-[#617A55]">
              <PublicNavLink href="/">{t.nav.home}</PublicNavLink>
              <PublicNavLink href="/about">{t.nav.about}</PublicNavLink>
              <PublicNavLink href="/classes">{t.nav.classes}</PublicNavLink>
              <PublicNavLink href="/courses">{t.nav.courses}</PublicNavLink>
              <PublicNavLink href="/private-sessions">
                {t.nav.privateSessions}
              </PublicNavLink>
              <PublicNavLink href="/shop">{t.nav.shop}</PublicNavLink>
              <PublicNavLink href="/contact">{t.nav.contact}</PublicNavLink>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <CartNavLink />
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#617A55] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4f6645]"
                href={user ? '/dashboard' : '/login'}
              >
                {user ? t.nav.account : t.nav.login}
              </Link>
            </div>
          </div>
        </nav>
        <main>{children}</main>
        <CartBottomBar />
        <footer className="border-t border-[#617A55]/15 px-5 py-10 sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm text-[#617A55] sm:flex-row sm:items-center sm:justify-between">
            <p>{t.footer.address}</p>
            <p>{t.footer.tagline}</p>
          </div>
          <div className="mx-auto mt-6 flex max-w-7xl flex-wrap items-center justify-between gap-4 border-t border-[#617A55]/15 pt-4">
            <nav
              aria-label={t.footer.policiesAriaLabel}
              className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#617A55]"
            >
              <Link href="/legal/terms" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">{t.footer.termsLink}</Link>
              <Link href="/legal/privacy" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">{t.footer.privacyLink}</Link>
              <Link href="/legal/cancellation" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">{t.footer.cancellationLink}</Link>
              <Link href="/legal/delivery" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">{t.footer.deliveryLink}</Link>
            </nav>
            <LanguageSwitcher />
          </div>
        </footer>
      </div>
    </I18nProvider>
  )
}

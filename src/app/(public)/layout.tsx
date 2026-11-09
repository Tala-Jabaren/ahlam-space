import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getT } from '@/i18n/get-t'
import { I18nProvider } from '@/i18n/i18n-context'
import { LanguageSwitcher } from '@/i18n/language-switcher'
import CartBottomBar from './cart-bottom-bar'
import SiteHeader from './site-header'
import MainContent from './main-content'

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
        <div aria-hidden="true" className="scroll-progress-bar fixed inset-x-0 top-0 z-40 h-[2px]" />
        <SiteHeader user={Boolean(user)} t={t} locale={locale} />
        <MainContent>{children}</MainContent>
        <CartBottomBar />
        <footer className="relative overflow-hidden border-t border-[#617A55]/15 bg-[#34472B] px-5 py-10 text-[#E4ECD6] sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p>{t.footer.address}</p>
            <p>{t.footer.tagline}</p>
          </div>
          <div className="mx-auto mt-6 flex max-w-7xl flex-wrap items-center justify-between gap-4 border-t border-[#E4ECD6]/15 pt-4">
            <nav
              aria-label={t.footer.policiesAriaLabel}
              className="flex flex-wrap gap-x-6 gap-y-2 text-sm"
            >
              <Link href="/legal/terms" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">{t.footer.termsLink}</Link>
              <Link href="/legal/privacy" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">{t.footer.privacyLink}</Link>
              <Link href="/legal/cancellation" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">{t.footer.cancellationLink}</Link>
              <Link href="/legal/delivery" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">{t.footer.deliveryLink}</Link>
            </nav>
            <LanguageSwitcher />
          </div>
          <p aria-hidden="true" className="footer-wordmark relative mt-8 -mb-6 select-none whitespace-nowrap text-center font-serif text-[#E4ECD6]/15 sm:-mb-10">
            Ahlam Space
          </p>
        </footer>
      </div>
    </I18nProvider>
  )
}

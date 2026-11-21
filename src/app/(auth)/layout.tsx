import Link from 'next/link'
import { Leaf } from 'lucide-react'
import { getT } from '@/i18n/get-t'
import { I18nProvider } from '@/i18n/i18n-context'
import { LanguageSwitcher } from '@/i18n/language-switcher'
import { checkoutAr } from '@/i18n/checkout-ar'
import rhythm from '@/components/layout/page-rhythm.module.css'
import styles from './auth.module.css'

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { t, locale, dir } = await getT()
  const { auth } = t.checkout ?? checkoutAr
  return (
    <I18nProvider locale={locale} dictionary={t}>
      <div dir={dir} className={`relative ${rhythm.authEntry}`}>
        <div className="absolute end-5 top-5 z-10">
          <LanguageSwitcher />
        </div>
        <main className={styles.page}>
          <div className={styles.shell}>
            <section className={styles.panel} aria-labelledby="auth-title">
              <div className={styles.content}>
                <Link href="/" className={styles.brand} lang="en" dir="ltr">
                  <span><Leaf aria-hidden="true" size={17} strokeWidth={1.6} /></span>
                  Ahlam Space
                </Link>
                {children}
              </div>
            </section>
            <div className={styles.art}>
              <p>{auth.artCaption}</p>
            </div>
          </div>
        </main>
      </div>
    </I18nProvider>
  )
}

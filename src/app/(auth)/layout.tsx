import { getT } from '@/i18n/get-t'
import { I18nProvider } from '@/i18n/i18n-context'
import { LanguageSwitcher } from '@/i18n/language-switcher'

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { t, locale, dir } = await getT()
  return (
    <I18nProvider locale={locale} dictionary={t}>
      <div dir={dir} className="relative">
        <div className="absolute end-5 top-5 z-10">
          <LanguageSwitcher />
        </div>
        {children}
      </div>
    </I18nProvider>
  )
}

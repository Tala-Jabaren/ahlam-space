'use client'

import { useT } from './i18n-context'

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, t, setLocale } = useT()
  const nextLocale = locale === 'ar' ? 'en' : 'ar'
  const label =
    locale === 'ar' ? t.langSwitcher.switchToEnglish : t.langSwitcher.switchToArabic

  return (
    <button
      type="button"
      onClick={() => setLocale(nextLocale)}
      aria-label={t.langSwitcher.ariaLabel}
      className={
        className ??
        'inline-flex min-h-11 items-center justify-center rounded-full border border-[#617A55]/30 px-4 text-sm font-semibold text-[#617A55] transition hover:bg-[#D6E2B6]/45'
      }
    >
      {label}
    </button>
  )
}

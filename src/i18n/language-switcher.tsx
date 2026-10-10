'use client'

import { useT } from './i18n-context'
import { Globe } from 'lucide-react'

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, t, setLocale } = useT()
  const nextLocale = locale === 'ar' ? 'en' : 'ar'
  const label =
    locale === 'ar' ? t.langSwitcher.switchToEnglish : t.langSwitcher.switchToArabic

  return (
    <button
      type="button"
      onClick={() => setLocale(nextLocale)}
      aria-label={`${t.langSwitcher.ariaLabel}: ${label}`}
      title={label}
      className={
        className ??
        'inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-[#617A55]/30 text-[#617A55] transition hover:bg-[#D6E2B6]/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55]'
      }
    >
      <Globe className="size-5" aria-hidden="true" />
    </button>
  )
}

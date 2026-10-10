'use client'

import { useEffect, useState } from 'react'
import { ar } from '@/i18n/ar'
import { en } from '@/i18n/en'
import { dirFor, isLocale, defaultLocale } from '@/i18n/config'

// This is the root error boundary - it can catch errors thrown above the
// (public) route group (including in src/app/layout.tsx itself), so it
// can't rely on being wrapped by I18nProvider the way (public)/error.tsx
// can. Error boundaries are also required to be Client Components, so it
// can't call the server-side getT() either. Reading the "lang" cookie
// directly here is the only way to still show the right language without
// depending on either of those.
function readLocale() {
  if (typeof document === 'undefined') return defaultLocale
  const match = document.cookie.match(/(?:^|;\s*)lang=([^;]+)/)
  const value = match?.[1]
  return isLocale(value) ? value : defaultLocale
}

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [locale] = useState(() => readLocale())

  useEffect(() => {
    console.error(error)
  }, [error])

  const t = locale === 'ar' ? ar : en
  const dir = dirFor(locale)

  return (
    <div
      dir={dir}
      className="flex min-h-screen flex-col items-center justify-center bg-[#F7F6F0] px-5 py-20 text-center text-[#25311f]"
    >
      <p className="font-serif text-7xl text-[#617A55]">!</p>
      <h1 className="mt-4 font-serif text-3xl sm:text-4xl">{t.errorPage.heading}</h1>
      <p className="mt-3 max-w-md text-base leading-7 text-[#4f5d49]">
        {t.errorPage.description}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-[#617A55] px-7 py-3 text-sm font-semibold text-[#F7F6F0] transition-colors hover:bg-[#617A55]/90"
      >
        {t.errorPage.retry}
      </button>
    </div>
  )
}

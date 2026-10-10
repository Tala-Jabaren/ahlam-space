'use client'

import { createContext, useCallback, useContext, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ar } from './ar'
import { defaultLocale, dirFor, LANG_COOKIE, type Locale } from './config'
import type { Dictionary } from './dictionaries'

type I18nContextValue = {
  locale: Locale
  dir: 'rtl' | 'ltr'
  t: Dictionary
  setLocale: (locale: Locale) => void
}

// A few client components under (public) (BookSessionButton in particular)
// are also reused outside the public route group - member-schedule, which
// isn't wrapped in I18nProvider and is out of scope for this pass. Rather
// than throwing when useT() is called with no provider above it, fall back
// to this default (the same Arabic-only experience those places already
// had), so they keep working unchanged.
const defaultContextValue: I18nContextValue = {
  locale: defaultLocale,
  dir: dirFor(defaultLocale),
  t: ar,
  setLocale: () => {},
}

const I18nContext = createContext<I18nContextValue>(defaultContextValue)

export function I18nProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale
  dictionary: Dictionary
  children: React.ReactNode
}) {
  const router = useRouter()

  const setLocale = useCallback(
    (nextLocale: Locale) => {
      document.cookie = `${LANG_COOKIE}=${nextLocale}; path=/; max-age=31536000; samesite=lax`
      router.refresh()
    },
    [router]
  )

  const value = useMemo<I18nContextValue>(
    () => ({ locale, dir: dirFor(locale), t: dictionary, setLocale }),
    [locale, dictionary, setLocale]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useT() {
  return useContext(I18nContext)
}

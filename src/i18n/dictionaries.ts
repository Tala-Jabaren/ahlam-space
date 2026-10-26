import { ar } from './ar'
import { en } from './en'
import type { Locale } from './config'
import { checkoutAr } from './checkout-ar'
import { checkoutEn } from './checkout-en'
import { privateSessionDetailsAr, privateSessionDetailsEn } from './private-session-details'
import { meditationsAr, meditationsEn } from './meditations'

export const dictionaries = {
  ar: { ...ar, checkout: checkoutAr, privateSessionDetails: privateSessionDetailsAr, meditations: meditationsAr },
  en: { ...en, checkout: checkoutEn, privateSessionDetails: privateSessionDetailsEn, meditations: meditationsEn },
}

export type Dictionary = typeof ar & {
  checkout?: typeof checkoutAr
  privateSessionDetails?: typeof privateSessionDetailsAr
  meditations?: typeof meditationsAr
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale]
}

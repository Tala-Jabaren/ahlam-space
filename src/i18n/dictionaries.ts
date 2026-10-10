import { ar } from './ar'
import { en } from './en'
import type { Locale } from './config'
import { checkoutAr } from './checkout-ar'
import { checkoutEn } from './checkout-en'

export const dictionaries = {
  ar: { ...ar, checkout: checkoutAr },
  en: { ...en, checkout: checkoutEn },
}

export type Dictionary = typeof ar & { checkout?: typeof checkoutAr }

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale]
}

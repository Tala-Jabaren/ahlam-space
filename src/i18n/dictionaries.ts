import { ar } from './ar'
import { en } from './en'
import type { Locale } from './config'

export const dictionaries = { ar, en }

export type Dictionary = typeof ar

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale]
}

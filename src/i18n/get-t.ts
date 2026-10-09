import 'server-only'
import { dirFor } from './config'
import { getDictionary } from './dictionaries'
import { getLocale } from './get-locale'

export async function getT() {
  const locale = await getLocale()
  return {
    t: getDictionary(locale),
    locale,
    dir: dirFor(locale),
  }
}

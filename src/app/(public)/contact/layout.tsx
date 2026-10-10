import type { Metadata } from 'next'
import { getLocale } from '@/i18n/get-locale'
import { getDictionary } from '@/i18n/dictionaries'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = getDictionary(locale)
  return pageMetadata({ ...t.seo.contact, path: '/contact', locale })
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}

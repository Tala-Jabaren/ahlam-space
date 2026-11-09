import type { Metadata } from 'next'
import type { Locale } from '@/i18n/config'

// Falls back to localhost for local dev - NEXT_PUBLIC_SITE_URL must be set
// to the real production domain before launch (see docs/LAUNCH-CHECKLIST.md).
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export const DEFAULT_OG_IMAGE = '/images/newhero.png'

export function pageMetadata({
  title,
  description,
  path,
  locale,
  image = DEFAULT_OG_IMAGE,
}: {
  title: string
  description: string
  path: string
  locale: Locale
  image?: string
}): Metadata {
  return {
    // The root layout sets a title.template ("%s | Ahlam Space") for pages
    // that only want to supply their own short title. Every title string
    // passed in here already includes the site name (see src/i18n/ar.ts and
    // en.ts's "seo" entries), so "absolute" is required to stop the
    // template being appended a second time.
    title: { absolute: title },
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url: path,
      siteName: 'Ahlam Space',
      locale: locale === 'ar' ? 'ar_PS' : 'en_US',
      type: 'website',
      images: [{ url: image }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

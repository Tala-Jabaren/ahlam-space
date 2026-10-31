import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin',
        '/admin/',
        '/dashboard',
        '/account',
        '/bookings',
        '/orders',
        '/member-schedule',
        '/checkout',
        '/cart',
        '/login',
        '/sign-up',
        '/forgot-password',
        '/reset-password',
        '/courses/', // purchase-gated course content, see courses/[id] noindex
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}

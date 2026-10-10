import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { SITE_URL } from '@/lib/seo'

const staticPaths = [
  '/',
  '/about',
  '/classes',
  '/courses',
  '/shop',
  '/private-sessions',
  '/contact',
  '/legal/terms',
  '/legal/privacy',
  '/legal/cancellation',
  '/legal/delivery',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  // Course pages are purchase-gated (see courses/[id]/page.tsx's noindex
  // metadata) and intentionally left out of the sitemap - nothing to crawl
  // there without an account and a paid purchase.
  const { data: products } = await supabase
    .from('products')
    .select('id, created_at')
    .eq('is_active', true)

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
  }))

  const productEntries: MetadataRoute.Sitemap = (products ?? []).map((product) => ({
    url: `${SITE_URL}/shop/${product.id}`,
    lastModified: product.created_at ? new Date(product.created_at) : new Date(),
  }))

  return [...staticEntries, ...productEntries]
}

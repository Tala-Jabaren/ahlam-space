import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getLocale } from '@/i18n/get-locale'
import { getDictionary } from '@/i18n/dictionaries'
import { pageMetadata } from '@/lib/seo'
import ShopCatalog from '@/app/(public)/shop/shop-catalog'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = getDictionary(locale)
  return pageMetadata({
    ...t.seo.shop,
    path: '/shop',
    locale,
    image: '/images/shop-hero-v2.png',
  })
}

export type ProductVariant = {
  id: string
  size: string | null
  color: string | null
  stock: number | null
}

export type ShopProduct = {
  id: string
  name: string
  description: string | null
  image_url: string | null
  price: number | null
  product_variants: ProductVariant[]
}

export default async function ShopPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select('id, name, description, image_url, price, product_variants(id, size, color, stock)')
    .eq('is_active', true)
    .order('name', { ascending: true })

  return (
    <ShopCatalog
      products={(data ?? []) as ShopProduct[]}
      hasError={Boolean(error)}
    />
  )
}

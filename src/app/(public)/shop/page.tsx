import { createClient } from '@/lib/supabase/server'
import ShopCatalog from './shop-catalog'

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

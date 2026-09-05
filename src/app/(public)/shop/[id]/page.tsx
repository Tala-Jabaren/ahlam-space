import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type Product = {
  id: string
  name: string
  description: string | null
  price: number | null
}

type ProductVariant = {
  id: string
  size: string | null
  color: string | null
  stock: number | null
  sku: string | null
}

type ProductPageProps = {
  params: Promise<{ id: string }>
}

function formatPrice(price: number | null) {
  if (price === null) {
    return 'Price coming soon'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price)
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: productData, error: productError } = await supabase
    .from('products')
    .select('id, name, description, price')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle()

  if (productError || !productData) {
    notFound()
  }

  const product = productData as Product

  const { data: variantData, error: variantError } = await supabase
    .from('product_variants')
    .select('id, size, color, stock, sku')
    .eq('product_id', id)
    .order('size', { ascending: true })

  const variants = (variantData ?? []) as ProductVariant[]

  return (
    <div style={{ maxWidth: 800, margin: '40px auto' }}>
      <h1>{product.name}</h1>
      {product.description && <p>{product.description}</p>}
      <p>{formatPrice(product.price)}</p>

      <h2>Variants</h2>
      {variantError && <p>Unable to load variants right now.</p>}
      {!variantError && variants.length === 0 && <p>No variants available.</p>}
      {!variantError && variants.length > 0 && (
        <ul>
          {variants.map((variant) => (
            <li key={variant.id}>
              <p>
                Size: {variant.size ?? 'N/A'} | Color:{' '}
                {variant.color ?? 'N/A'} | Stock: {variant.stock ?? 0} | SKU:{' '}
                {variant.sku ?? 'N/A'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

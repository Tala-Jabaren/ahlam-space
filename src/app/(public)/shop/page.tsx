import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type Product = {
  id: string
  name: string
  description: string | null
  price: number | null
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

export default async function ShopPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select('id, name, description, price')
    .eq('is_active', true)
    .order('name', { ascending: true })

  const products = (data ?? []) as Product[]

  return (
    <div style={{ maxWidth: 800, margin: '40px auto' }}>
      <h1>Shop</h1>
      {error && <p>Unable to load products right now.</p>}
      {!error && products.length === 0 && <p>No products available yet.</p>}
      {!error && products.length > 0 && (
        <ul>
          {products.map((product) => (
            <li key={product.id}>
              <h2>
                <Link href={`/shop/${product.id}`}>{product.name}</Link>
              </h2>
              {product.description && <p>{product.description}</p>}
              <p>{formatPrice(product.price)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

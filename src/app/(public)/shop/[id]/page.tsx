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
    <div className="px-5 py-16 sm:px-8 lg:px-10">
      <section className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="min-h-[340px] rounded-[2rem] bg-[#D6E2B6] p-6">
          <div className="h-full min-h-[292px] rounded-[1.5rem] border border-white/60 bg-[#F7F6F0]/50" />
        </div>
        <div className="space-y-5">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#617A55]">
            Studio shop
          </p>
          <h1 className="font-serif text-5xl leading-tight text-[#25311f] sm:text-6xl">
            {product.name}
          </h1>
          {product.description && (
            <p className="text-lg leading-8 text-[#4f5d49]">
              {product.description}
            </p>
          )}
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#617A55]">
            {formatPrice(product.price)}
          </p>
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-7xl">
        <h2 className="font-serif text-4xl text-[#25311f]">Variants</h2>
      {variantError && (
        <div className="mt-6 rounded-[1.75rem] bg-[#C7D6E8]/55 p-8 text-[#4f5d49]">
          Unable to load variants right now.
        </div>
      )}
      {!variantError && variants.length === 0 && (
        <div className="mt-6 rounded-[1.75rem] bg-[#C7D6E8]/55 p-8 text-[#4f5d49]">
          No variants available.
        </div>
      )}
      {!variantError && variants.length > 0 && (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {variants.map((variant) => (
            <li
              key={variant.id}
              className="rounded-[1.5rem] border border-[#617A55]/10 bg-white/70 p-5 text-sm leading-7 text-[#4f5d49]"
            >
              <p>
                <span className="font-semibold text-[#25311f]">Size:</span>{' '}
                {variant.size ?? 'N/A'}
              </p>
              <p>
                <span className="font-semibold text-[#25311f]">Color:</span>{' '}
                {variant.color ?? 'N/A'}
              </p>
              <p>
                <span className="font-semibold text-[#25311f]">Stock:</span>{' '}
                {variant.stock ?? 0}
              </p>
              <p>
                <span className="font-semibold text-[#25311f]">SKU:</span>{' '}
                {variant.sku ?? 'N/A'}
              </p>
            </li>
          ))}
        </ul>
      )}
      </section>
    </div>
  )
}

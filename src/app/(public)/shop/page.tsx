import { createClient } from '@/lib/supabase/server'
import AddToCartButton from './[id]/add-to-cart-button'

type ProductVariant = {
  id: string
  size: string | null
  color: string | null
  stock: number | null
}

type Product = {
  id: string
  name: string
  price: number | null
  product_variants: ProductVariant[]
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
    .select('id, name, price, product_variants(id, size, color, stock)')
    .eq('is_active', true)
    .order('name', { ascending: true })

  const products = (data ?? []) as Product[]

  return (
    <div className="px-5 py-16 sm:px-8 lg:px-10">
      <section className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div className="space-y-5">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#617A55]">
              Studio shop
            </p>
            <h1 className="font-serif text-5xl leading-tight text-[#25311f] sm:text-6xl">
              Shop
            </h1>
            <p className="text-lg leading-8 text-[#4f5d49]">
              Small objects for care, ritual, and warmth beyond the studio.
            </p>
          </div>
          <div className="min-h-52 rounded-[2rem] bg-[#C7D6E8] p-5">
            <div className="h-full min-h-44 rounded-[1.5rem] bg-[#F7F6F0]/55" />
          </div>
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-7xl">
      {error && (
        <div className="rounded-[1.75rem] bg-[#C7D6E8]/55 p-8 text-[#4f5d49]">
          Unable to load products right now.
        </div>
      )}
      {!error && products.length === 0 && (
        <div className="rounded-[1.75rem] bg-[#C7D6E8]/55 p-8 text-[#4f5d49]">
          No products available yet.
        </div>
      )}
      {!error && products.length > 0 && (
        <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => {
            const variant =
              product.product_variants.find((item) => (item.stock ?? 0) > 0) ??
              product.product_variants[0]

            return (
              <li
                key={product.id}
                className="flex min-h-full flex-col rounded-[1.75rem] border border-[#617A55]/10 bg-white/70 p-5 shadow-sm"
              >
                <div className="aspect-[4/3] rounded-[1.5rem] bg-[#D6E2B6]" />
                <h2 className="mt-5 font-serif text-3xl leading-tight text-[#25311f]">
                  {product.name}
                </h2>
                <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-[#617A55]">
                  {formatPrice(product.price)}
                </p>
                <div className="mt-5">
                  {variant ? (
                    <AddToCartButton
                      productId={product.id}
                      variantId={variant.id}
                      name={product.name}
                      price={product.price ?? 0}
                      size={variant.size}
                      color={variant.color}
                      stock={variant.stock ?? 0}
                      imageUrl={null}
                    />
                  ) : (
                    <span className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#C7D6E8]/50 px-5 text-sm font-semibold text-[#617A55]/70">
                      غير متوفر
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      </section>
    </div>
  )
}

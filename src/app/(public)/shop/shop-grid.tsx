'use client'

import { useMemo, useState } from 'react'
import AddToCartButton from './[id]/add-to-cart-button'

type ProductVariant = {
  id: string
  size: string | null
  color: string | null
  stock: number | null
}

export type ShopProduct = {
  id: string
  name: string
  description: string | null
  price: number | null
  product_variants: ProductVariant[]
}

const CATEGORY_ALL = 'الكل'

const CATEGORY_BY_PRODUCT_NAME: Record<string, string> = {
  'شمعة دفا': 'شموع زُلفة',
  'شمعة بصيرة': 'شموع زُلفة',
  'شمعة سكون': 'شموع زُلفة',
  'شمعة بيت عربي': 'شموع زُلفة',
  'جرانولا ولبن يوناني': 'أكل صحي',
  'تيراميسو صحي': 'أكل صحي',
  'كتيب مساحة أحلام': 'كتيب مساحة أحلام',
}

const CATEGORIES = [
  CATEGORY_ALL,
  'شموع زُلفة',
  'أكل صحي',
  'كتيب مساحة أحلام',
]

const PLACEHOLDER_BY_PRODUCT_NAME: Record<string, string> = {
  'شمعة دفا': 'bg-gradient-to-br from-[#D6E2B6] via-[#F7F6F0] to-[#C7D6E8]',
  'شمعة بصيرة': 'bg-gradient-to-br from-[#C7D6E8] via-[#F7F6F0] to-[#D6E2B6]',
  'شمعة سكون': 'bg-gradient-to-br from-[#617A55]/20 via-[#F7F6F0] to-[#D6E2B6]',
  'شمعة بيت عربي':
    'bg-gradient-to-br from-[#617A55]/15 via-[#D6E2B6]/60 to-[#F7F6F0]',
  'جرانولا ولبن يوناني': 'bg-gradient-to-br from-[#D6E2B6] to-[#F7F6F0]',
  'تيراميسو صحي': 'bg-gradient-to-br from-[#C7D6E8]/70 to-[#F7F6F0]',
  'كتيب مساحة أحلام':
    'bg-gradient-to-br from-[#617A55]/10 via-[#F7F6F0] to-[#C7D6E8]/50',
}
const DEFAULT_PLACEHOLDER = 'bg-gradient-to-br from-[#D6E2B6] to-[#F7F6F0]'

type SortOrder = 'default' | 'price-asc' | 'price-desc'

function formatPrice(price: number | null) {
  if (price === null) {
    return '-'
  }
  return `₪${price}`
}

export default function ShopGrid({ products }: { products: ShopProduct[] }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(CATEGORY_ALL)
  const [sortOrder, setSortOrder] = useState<SortOrder>('default')

  const visibleProducts = useMemo(() => {
    const query = search.trim()
    let result = products.filter((product) => {
      const productCategory = CATEGORY_BY_PRODUCT_NAME[product.name]
      const matchesCategory =
        category === CATEGORY_ALL || productCategory === category
      const matchesQuery =
        query === '' ||
        product.name.includes(query) ||
        (product.description ?? '').includes(query)
      return matchesCategory && matchesQuery
    })

    if (sortOrder === 'price-asc') {
      result = [...result].sort(
        (a, b) => (a.price ?? 0) - (b.price ?? 0)
      )
    } else if (sortOrder === 'price-desc') {
      result = [...result].sort(
        (a, b) => (b.price ?? 0) - (a.price ?? 0)
      )
    }

    return result
  }, [products, search, category, sortOrder])

  return (
    <div>
      <div className="mt-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block max-w-sm">
            <span className="sr-only">البحث</span>
            <span
              aria-hidden="true"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#617A55]/60"
            >
              ⌕
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحثي عن منتج..."
              className="min-h-11 w-full rounded-full border border-[#617A55]/15 bg-white/70 py-2 pl-4 pr-11 text-sm text-[#25311f] outline-none transition placeholder:text-[#617A55]/55 focus:border-[#617A55]/40"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            {CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
                className={`inline-flex min-h-10 items-center justify-center rounded-full px-5 text-sm font-medium transition ${
                  category === item
                    ? 'bg-[#617A55] text-white'
                    : 'border border-[#617A55]/15 bg-white/70 text-[#617A55] hover:bg-[#D6E2B6]/40'
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <label className="relative inline-flex">
            <span className="sr-only">الترتيب حسب</span>
            <select
              value={sortOrder}
              onChange={(event) =>
                setSortOrder(event.target.value as SortOrder)
              }
              className="min-h-11 rounded-full border border-[#617A55]/15 bg-white/70 px-4 text-sm text-[#617A55] outline-none transition focus:border-[#617A55]/40"
            >
              <option value="default">الترتيب حسب</option>
              <option value="price-asc">السعر: من الأقل إلى الأعلى</option>
              <option value="price-desc">السعر: من الأعلى إلى الأقل</option>
            </select>
          </label>
        </div>
      </div>

      {visibleProducts.length === 0 ? (
        <div className="mt-10 rounded-[1.5rem] bg-[#C7D6E8]/40 p-10 text-center">
          <p className="font-serif text-xl text-[#25311f]">
            لا توجد منتجات مطابقة.
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {visibleProducts.map((product) => {
            const variant =
              product.product_variants.find(
                (item) => (item.stock ?? 0) > 0
              ) ?? product.product_variants[0]
            const placeholder =
              PLACEHOLDER_BY_PRODUCT_NAME[product.name] ?? DEFAULT_PLACEHOLDER

            return (
              <li
                key={product.id}
                className="group flex min-h-full flex-col overflow-hidden rounded-[1.25rem] border border-[#617A55]/10 bg-white/80 shadow-[0_1px_3px_rgba(37,49,31,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(37,49,31,0.1)]"
              >
                <div
                  className={`aspect-square w-full ${placeholder}`}
                  aria-hidden="true"
                />

                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h2 className="font-serif text-lg leading-tight text-[#25311f]">
                    {product.name}
                  </h2>
                  {product.description && (
                    <p className="line-clamp-2 text-xs leading-5 text-[#617A55]/75">
                      {product.description}
                    </p>
                  )}

                  <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                    <p className="font-serif text-lg font-semibold text-[#25311f]">
                      {formatPrice(product.price)}
                    </p>

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
                        className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-[#617A55] px-3.5 text-xs font-semibold text-white transition hover:bg-[#4f6645] disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    ) : (
                      <span className="inline-flex min-h-9 items-center justify-center rounded-full bg-[#C7D6E8]/50 px-3.5 text-xs font-semibold text-[#617A55]/70">
                        غير متوفر
                      </span>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

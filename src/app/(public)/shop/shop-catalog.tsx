'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { useT } from '@/i18n/i18n-context'
import AddToCartButton from './[id]/add-to-cart-button'
import type { ShopProduct } from './page'

type Category = 'all' | 'candles' | 'food' | 'journal'
type SortOrder = 'default' | 'price-asc' | 'price-desc' | 'name'

function getCategory(productName: string): Exclude<Category, 'all'> {
  if (productName.includes('شمعة')) return 'candles'
  if (productName.includes('كتيب')) return 'journal'
  return 'food'
}

export default function ShopCatalog({
  products,
  hasError,
}: {
  products: ShopProduct[]
  hasError: boolean
}) {
  const { t, locale, dir } = useT()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<Category>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('default')

  const categories: Array<{ value: Category; label: string }> = [
    { value: 'all', label: t.shop.list.categoryAll },
    { value: 'candles', label: t.shop.list.categoryCandles },
    { value: 'food', label: t.shop.list.categoryFood },
    { value: 'journal', label: t.shop.list.categoryJournal },
  ]

  function formatPrice(price: number | null) {
    if (price === null) return t.shop.list.priceComingSoon
    return `${new Intl.NumberFormat(locale === 'ar' ? 'ar' : 'en-US').format(price)} ₪`
  }

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('ar')
    const filtered = products.filter((product) => {
      const matchesCategory =
        category === 'all' || getCategory(product.name) === category
      const matchesSearch =
        !query ||
        product.name.toLocaleLowerCase('ar').includes(query) ||
        Boolean(product.description?.toLocaleLowerCase('ar').includes(query))

      return matchesCategory && matchesSearch
    })

    return [...filtered].sort((first, second) => {
      if (sortOrder === 'price-asc') return (first.price ?? 0) - (second.price ?? 0)
      if (sortOrder === 'price-desc') return (second.price ?? 0) - (first.price ?? 0)
      if (sortOrder === 'name') return first.name.localeCompare(second.name, 'ar')
      return 0
    })
  }, [category, products, search, sortOrder])

  return (
    <div className="bg-[#F7F6F0] pb-16" dir={dir}>
      <section className="overflow-hidden border-b border-[#617A55]/10 bg-[#D6E2B6]/35">
        <div className="mx-auto grid min-h-[300px] max-w-7xl lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative min-h-56 overflow-hidden bg-[#C7D6E8]/45 lg:min-h-full">
            <Image
              src="/images/shop-hero-v2.png"
              alt={t.shop.list.heroImageAlt}
              fill
              priority
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-cover object-center"
            />
          </div>

          <div className="flex flex-col justify-center px-5 py-10 sm:px-10 lg:px-14">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#617A55]">AHLAM SHOP</p>
            <h1 className="mt-4 font-serif text-4xl leading-[1.35] text-[#25311f] sm:text-5xl">
              {t.shop.list.heroHeading}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-8 text-[#617A55] sm:text-lg">
              {t.shop.list.heroParagraph}
            </p>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 pt-7 sm:px-8 lg:px-10">
        <div className="grid gap-4 border-b border-[#617A55]/12 pb-7 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.4fr)_220px] lg:items-center">
          <label className="relative block">
            <span className="sr-only">{t.shop.list.searchSrLabel}</span>
            <span aria-hidden="true" className="absolute end-4 top-1/2 -translate-y-1/2 text-lg text-[#617A55]">⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t.shop.list.searchPlaceholder}
              className="min-h-11 w-full rounded-full border border-[#617A55]/20 bg-white px-11 text-sm text-[#25311f] outline-none transition placeholder:text-[#617A55]/55 focus:border-[#617A55]"
            />
          </label>

          <div className="flex flex-wrap items-center justify-center gap-2" aria-label={t.shop.list.categoriesAriaLabel}>
            {categories.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setCategory(item.value)}
                aria-pressed={category === item.value}
                className={`min-h-10 rounded-full px-5 text-sm transition ${
                  category === item.value
                    ? 'bg-[#617A55] text-white'
                    : 'bg-white text-[#617A55] hover:bg-[#D6E2B6]/60'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="sr-only">{t.shop.list.sortSrLabel}</span>
            <select
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value as SortOrder)}
              className="min-h-11 w-full rounded-full border border-[#617A55]/20 bg-white px-5 text-sm text-[#25311f] outline-none transition focus:border-[#617A55]"
            >
              <option value="default">{t.shop.list.sortDefault}</option>
              <option value="price-asc">{t.shop.list.sortPriceAsc}</option>
              <option value="price-desc">{t.shop.list.sortPriceDesc}</option>
              <option value="name">{t.shop.list.sortName}</option>
            </select>
          </label>
        </div>

        {hasError && <Message>{t.shop.list.loadError}</Message>}
        {!hasError && products.length === 0 && <Message>{t.shop.list.empty}</Message>}
        {!hasError && products.length > 0 && visibleProducts.length === 0 && (
          <Message>{t.shop.list.noMatches}</Message>
        )}

        {!hasError && visibleProducts.length > 0 && (
          <ul className="mt-8 grid grid-cols-1 gap-5 min-[520px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleProducts.map((product) => {
              const variant =
                product.product_variants.find((item) => (item.stock ?? 0) > 0) ??
                product.product_variants[0]
              const productCategory = getCategory(product.name)

              return (
                <li
                  key={product.id}
                  className="group flex min-h-full flex-col overflow-hidden rounded-[20px] border border-[#617A55]/12 bg-white shadow-[0_4px_18px_rgba(37,49,31,0.05)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(37,49,31,0.09)]"
                >
                  <div
                    className={`relative aspect-[4/3] overflow-hidden ${
                      productCategory === 'candles'
                        ? 'bg-[#D6E2B6]/65'
                        : productCategory === 'food'
                          ? 'bg-[#C7D6E8]/55'
                          : 'bg-[#F7F6F0]'
                    }`}
                  >
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={`${t.shop.list.productImageAltPrefix} ${product.name}`}
                        fill
                        sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 520px) 50vw, 100vw"
                        className="object-cover"
                      />
                    ) : (
                      <>
                        <div className="absolute inset-x-[18%] bottom-[-8%] h-[70%] rounded-t-full bg-white/55" />
                        <div className="absolute start-[12%] top-[12%] h-20 w-10 -rotate-12 rounded-[100%_0_100%_0] bg-[#617A55]/20" />
                        <div className="absolute end-[15%] top-[18%] h-24 w-12 rotate-12 rounded-[0_100%_0_100%] bg-[#617A55]/15" />
                      </>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <h2 className="font-serif text-xl leading-tight text-[#25311f] sm:text-2xl">{product.name}</h2>
                    {product.description && (
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#617A55]/80">{product.description}</p>
                    )}
                    <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                      <span className="shrink-0 font-semibold text-[#617A55]">{formatPrice(product.price)}</span>
                      {variant ? (
                        <AddToCartButton
                          productId={product.id}
                          variantId={variant.id}
                          name={product.name}
                          price={product.price ?? 0}
                          size={variant.size}
                          color={variant.color}
                          stock={variant.stock ?? 0}
                          imageUrl={product.image_url}
                          compact
                        />
                      ) : (
                        <span className="text-sm font-semibold text-[#617A55]/60">{t.shop.list.unavailable}</span>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-8 rounded-lg bg-[#C7D6E8]/45 p-8 text-center text-[#617A55]">
      {children}
    </div>
  )
}

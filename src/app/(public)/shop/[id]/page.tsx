import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getT } from '@/i18n/get-t'
import { getLocale } from '@/i18n/get-locale'
import { getDictionary } from '@/i18n/dictionaries'
import type { Locale } from '@/i18n/config'
import { pageMetadata } from '@/lib/seo'
import AddToCartButton from './add-to-cart-button'

type Product = {
  id: string
  name: string
  description: string | null
  image_url: string | null
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

function formatPrice(price: number | null, locale: Locale, priceComingSoon: string) {
  if (price === null) {
    return priceComingSoon
  }

  return `${new Intl.NumberFormat(locale === 'ar' ? 'ar' : 'en-US').format(price)} ₪`
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params
  const locale = await getLocale()
  const t = getDictionary(locale)
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('name, description, image_url')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle()

  if (!data) {
    return pageMetadata({ ...t.seo.shop, path: `/shop/${id}`, locale })
  }

  return pageMetadata({
    title: `${data.name} | ${t.seo.siteName}`,
    description: data.description || t.seo.shop.description,
    path: `/shop/${id}`,
    locale,
    image: data.image_url || '/images/shop-hero-v2.png',
  })
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { t, locale, dir } = await getT()

  const { data: productData, error: productError } = await supabase
    .from('products')
    .select('id, name, description, image_url, price')
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
    <div className="px-5 py-16 sm:px-8 lg:px-10" dir={dir}>
      <section className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="min-h-[340px] rounded-[2rem] bg-[#D6E2B6] p-6">
          <div className="relative h-full min-h-[292px] overflow-hidden rounded-[1.5rem] border border-white/60 bg-[#F7F6F0]/50">
            {product.image_url && (
              <Image
                src={product.image_url}
                alt={`${t.shop.list.productImageAltPrefix} ${product.name}`}
                fill
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
                priority
              />
            )}
          </div>
        </div>
        <div className="space-y-5">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#617A55]">
            {t.shop.product.eyebrow}
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
            {formatPrice(product.price, locale, t.shop.product.priceComingSoon)}
          </p>
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-7xl">
        <h2 className="font-serif text-4xl text-[#25311f]">{t.shop.product.variantsHeading}</h2>
      {variantError && (
        <div className="mt-6 rounded-[1.75rem] bg-[#C7D6E8]/55 p-8 text-[#4f5d49]">
          {t.shop.product.variantsLoadError}
        </div>
      )}
      {!variantError && variants.length === 0 && (
        <div className="mt-6 rounded-[1.75rem] bg-[#C7D6E8]/55 p-8 text-[#4f5d49]">
          {t.shop.product.noVariants}
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
                <span className="font-semibold text-[#25311f]">{t.shop.product.sizeLabel}:</span>{' '}
                {variant.size ?? t.common.notSpecified}
              </p>
              <p>
                <span className="font-semibold text-[#25311f]">{t.shop.product.colorLabel}:</span>{' '}
                {variant.color ?? t.common.notSpecified}
              </p>
              <p>
                <span className="font-semibold text-[#25311f]">{t.shop.product.stockLabel}:</span>{' '}
                {variant.stock ?? 0}
              </p>
              <p>
                <span className="font-semibold text-[#25311f]">{t.shop.product.skuLabel}:</span>{' '}
                {variant.sku ?? t.common.notSpecified}
              </p>
              <div className="mt-4">
                <AddToCartButton
                  productId={product.id}
                  variantId={variant.id}
                  name={product.name}
                  price={product.price ?? 0}
                  size={variant.size}
                  color={variant.color}
                  stock={variant.stock ?? 0}
                  imageUrl={product.image_url}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      </section>
    </div>
  )
}

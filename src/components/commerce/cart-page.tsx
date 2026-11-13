'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useCart } from '@/lib/cart/cart-context'

import { useT } from '@/i18n/i18n-context'
import { checkoutAr } from '@/i18n/checkout-ar'
import { useExperienceRoutes } from './experience-provider'

const subscribeToLocation = () => () => {}

export default function CartPage() {
  const routes = useExperienceRoutes()
  const { t, locale, dir } = useT()
  const c = t.checkout ?? checkoutAr
  const formatPrice = (price: number) =>
    new Intl.NumberFormat(locale === 'ar' ? 'ar' : 'en-US', {
      style: 'currency',
      currency: 'ILS',
    }).format(price)
  const formatNumber = (value: number) =>
    new Intl.NumberFormat(locale === 'ar' ? 'ar' : 'en-US').format(value)
  const { items, removeFromCart, updateQuantity, totalPrice } = useCart()
  const checkoutMessage = useSyncExternalStore(
    subscribeToLocation,
    () =>
      new URLSearchParams(window.location.search).get('message') ===
      'empty-checkout',
    () => false,
  )

  return (
    <div className="px-5 py-6 text-start sm:px-8 sm:py-8 lg:px-10" dir={dir}>
      <section className="mx-auto max-w-5xl">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#617A55]">
          {c.cart.eyebrow}
        </p>
        <h1 className="mt-3 font-serif text-5xl leading-tight text-[#25311f] sm:text-6xl">
          {c.cart.title}
        </h1>

        {checkoutMessage && (
          <p className="mt-6 rounded-lg bg-[#C7D6E8]/45 p-4 text-sm text-[#25311f]">
            {c.cart.emptyNotice}
          </p>
        )}

        {items.length === 0 ? (
          <div className="mt-10 rounded-[1.75rem] bg-[#C7D6E8]/55 p-8 text-[#4f5d49]">
            <p>{c.cart.empty}</p>
            <Link
              href={routes.shop}
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[#617A55] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#4f6645]"
            >
              {c.cart.browse}
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-10 grid gap-5">
              {items.map((item) => (
                <li
                  key={item.variant_id}
                  className="flex flex-col gap-4 rounded-[1.75rem] border border-[#617A55]/10 bg-white/70 p-5 shadow-sm sm:flex-row sm:items-center"
                >
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[1.25rem] bg-[#D6E2B6]">
                    {item.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="font-serif text-2xl leading-tight text-[#25311f]">
                      <Link href={`${routes.shop}/${item.product_id}`} className="rounded underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-[#617A55]">{item.name}</Link>
                    </h2>
                    {(item.size || item.color) && (
                      <p className="mt-1 text-sm text-[#4f5d49]">
                        {[item.size, item.color].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    <p className="mt-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#617A55]">
                      {formatPrice(item.price)}
                    </p>

                    <div className="mt-3 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.variant_id, item.quantity - 1)
                        }
                        disabled={item.quantity <= 1}
                        aria-label={c.cart.decrease}
                        className="grid size-9 place-items-center rounded-full border border-[#617A55]/20 text-lg transition hover:bg-[#D6E2B6]/50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        −
                      </button>
                      <span className="min-w-6 text-center font-semibold text-[#25311f]">
                        {formatNumber(item.quantity)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.variant_id, item.quantity + 1)
                        }
                        aria-label={c.cart.increase}
                        className="grid size-9 place-items-center rounded-full border border-[#617A55]/20 text-lg transition hover:bg-[#D6E2B6]/50"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFromCart(item.variant_id)}
                    className="self-start text-sm font-medium text-[#617A55]/70 underline transition hover:text-[#617A55] sm:self-center"
                  >
                    {c.cart.remove}
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-col items-end gap-4 border-t border-[#617A55]/15 pt-8">
              <p className="font-serif text-3xl text-[#25311f]">
                {c.cart.total}: {formatPrice(totalPrice)}
              </p>
              <Link
                href={routes.checkout}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#617A55] px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4f6645]"
              >
                {c.cart.continue}
              </Link>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

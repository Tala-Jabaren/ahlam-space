'use client'

import Link from 'next/link'
import { useCart } from '@/lib/cart/cart-context'

function formatPrice(price: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price)
}

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, totalPrice } = useCart()

  return (
    <div className="px-5 py-16 sm:px-8 lg:px-10">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#617A55]">
          Studio shop
        </p>
        <h1 className="mt-3 font-serif text-5xl leading-tight text-[#25311f] sm:text-6xl">
          Cart
        </h1>

        {items.length === 0 ? (
          <div className="mt-10 rounded-[1.75rem] bg-[#C7D6E8]/55 p-8 text-[#4f5d49]">
            <p>سلتك فارغة حاليًا.</p>
            <Link
              href="/shop"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[#617A55] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#4f6645]"
            >
              تصفحي المتجر
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
                      {item.name}
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
                        aria-label="إنقاص الكمية"
                        className="grid size-9 place-items-center rounded-full border border-[#617A55]/20 text-lg transition hover:bg-[#D6E2B6]/50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        −
                      </button>
                      <span className="min-w-6 text-center font-semibold text-[#25311f]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.variant_id, item.quantity + 1)
                        }
                        aria-label="زيادة الكمية"
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
                    إزالة
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-col items-end gap-4 border-t border-[#617A55]/15 pt-8">
              <p className="font-serif text-3xl text-[#25311f]">
                الإجمالي: {formatPrice(totalPrice)}
              </p>
              <Link
                href="/checkout"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#617A55] px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4f6645]"
              >
                متابعة الشراء
              </Link>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

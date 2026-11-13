'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCart } from '@/lib/cart/cart-context'
import { useT } from '@/i18n/i18n-context'
import { useExperienceRoutes } from '@/components/commerce/experience-provider'

export default function CartBottomBar({ member = false }: { member?: boolean }) {
  const routes = useExperienceRoutes()
  const pathname = usePathname()
  const { totalQuantity } = useCart()
  const { t, dir } = useT()
  const previousQuantity = useRef(totalQuantity)
  const [showAddedMessage, setShowAddedMessage] = useState(false)

  useEffect(() => {
    if (totalQuantity > previousQuantity.current) {
      setShowAddedMessage(true)
      const timeout = window.setTimeout(() => setShowAddedMessage(false), 2200)
      previousQuantity.current = totalQuantity
      return () => window.clearTimeout(timeout)
    }

    previousQuantity.current = totalQuantity
  }, [totalQuantity])

  if (totalQuantity === 0 || pathname === routes.cart || (member && pathname === routes.checkout)) {
    return null
  }

  return (
    <>
      {showAddedMessage && (
        <div className="pointer-events-none fixed inset-0 z-[70] grid place-items-center p-4">
          <div
            role="status"
            aria-live="polite"
            dir={dir}
            className="w-max max-w-full rounded-full bg-[#D6E2B6] px-6 py-3 text-center text-sm font-semibold text-[#25311f] shadow-[0_8px_24px_rgba(37,49,31,0.14)]"
          >
            {t.shop.cartBar.addedToast}
          </div>
        </div>
      )}

      <div
        dir={dir}
        className={member ? 'fixed inset-x-4 bottom-24 z-40 mx-auto max-w-xl rounded-2xl border border-[#617A55]/15 bg-[#D6E2B6] p-3 shadow-sm md:end-[304px] md:bottom-6' : 'fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-2xl border border-[#617A55]/15 bg-[#D6E2B6] p-3 shadow-[0_8px_28px_rgba(37,49,31,0.14)] sm:bottom-6'}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3 text-[#25311f]">
            <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-[#F7F6F0]/65 text-[#617A55]">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5"
            >
              <path d="M3 4h2l1.5 12.5a2 2 0 0 0 2 1.8h8.4a2 2 0 0 0 2-1.7L20 8H6" />
              <circle cx="9.5" cy="20" r="1.3" fill="currentColor" stroke="none" />
              <circle cx="16.5" cy="20" r="1.3" fill="currentColor" stroke="none" />
            </svg>
            <span className="absolute -start-1 -top-1 grid min-w-5 place-items-center rounded-full bg-[#617A55] px-1 text-[11px] font-semibold leading-5 text-white">
              {totalQuantity}
            </span>
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-[#25311f]">{t.shop.cartBar.cartLabel}</p>
              <p className="text-sm text-[#617A55]">
                {totalQuantity}{' '}
                {totalQuantity === 1
                  ? t.shop.cartBar.itemSingular
                  : t.shop.cartBar.itemPlural}
              </p>
            </div>
          </div>

          <Link
            href={routes.cart}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[#617A55] px-5 text-sm font-semibold text-white transition hover:bg-[#526849]"
          >
            {t.shop.cartBar.viewCart}
          </Link>
        </div>
      </div>
    </>
  )
}

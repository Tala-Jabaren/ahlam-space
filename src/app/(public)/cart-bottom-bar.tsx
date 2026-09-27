'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCart } from '@/lib/cart/cart-context'

export default function CartBottomBar() {
  const pathname = usePathname()
  const { totalQuantity } = useCart()

  if (totalQuantity === 0 || pathname === '/cart') {
    return null
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-2xl border border-[#617A55]/15 bg-[#F7F6F0]/95 p-3 shadow-[0_8px_28px_rgba(37,49,31,0.14)] backdrop-blur sm:bottom-6"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3 text-[#25311f]">
          <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-[#D6E2B6] text-[#617A55]">
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
            <span className="absolute -left-1 -top-1 grid min-w-5 place-items-center rounded-full bg-[#617A55] px-1 text-[11px] font-semibold leading-5 text-white">
              {totalQuantity}
            </span>
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-[#25311f]">السلة</p>
            <p className="text-sm text-[#617A55]">
              {totalQuantity} {totalQuantity === 1 ? 'منتج' : 'منتجات'}
            </p>
          </div>
        </div>

        <Link
          href="/cart"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[#617A55] px-5 text-sm font-semibold text-white transition hover:bg-[#526849]"
        >
          عرض السلة
        </Link>
      </div>
    </div>
  )
}

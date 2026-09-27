'use client'

import Link from 'next/link'
import { useCart } from '@/lib/cart/cart-context'

export default function CartNavLink() {
  const { totalQuantity } = useCart()

  return (
    <Link
      href="/cart"
      aria-label={`السلة${totalQuantity > 0 ? ` (${totalQuantity})` : ''}`}
      className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full transition hover:bg-[#D6E2B6]/35"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-6 text-[#617A55]"
      >
        <path d="M3 4h2l1.5 12.5a2 2 0 0 0 2 1.8h8.4a2 2 0 0 0 2-1.7L20 8H6" />
        <circle cx="9.5" cy="20" r="1.3" fill="currentColor" stroke="none" />
        <circle cx="16.5" cy="20" r="1.3" fill="currentColor" stroke="none" />
      </svg>
      {totalQuantity > 0 && (
        <span className="absolute -top-1 -right-1 grid min-w-[1.25rem] place-items-center rounded-full bg-[#617A55] px-1 text-[11px] font-semibold leading-5 text-white">
          {totalQuantity}
        </span>
      )}
    </Link>
  )
}

'use client'

import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { useCart } from '@/lib/cart/cart-context'
import { memberRoutes } from '@/lib/experience-routes'

export default function MemberCartLink() {
  const { totalQuantity } = useCart()
  return <Link href={memberRoutes.cart} aria-label={`السلة، ${totalQuantity} منتجات`} className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-[#617A55] hover:bg-[#D6E2B6]/50 focus-visible:outline-2 focus-visible:outline-[#617A55]">
    <ShoppingCart aria-hidden="true" size={22} />
    {totalQuantity > 0 && <span className="absolute -end-1 -top-1 rounded-full bg-[#617A55] px-1.5 text-xs text-white">{totalQuantity}</span>}
  </Link>
}

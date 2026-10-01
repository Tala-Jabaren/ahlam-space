'use client'

import { useEffect, useState } from 'react'
import { useCart } from '@/lib/cart/cart-context'

export default function CartToast() {
  const { lastAddedItem } = useCart()
  // Tracks the addedAt of the most recently *dismissed* toast, so visibility
  // is derived from comparing it against the current item instead of a
  // separate boolean that would need setting synchronously in the effect
  // below (the timeout callback is the only place that calls setState).
  const [dismissedAt, setDismissedAt] = useState<number | null>(null)

  useEffect(() => {
    if (!lastAddedItem) {
      return
    }
    const timeout = window.setTimeout(() => {
      setDismissedAt(lastAddedItem.addedAt)
    }, 2500)
    return () => window.clearTimeout(timeout)
  }, [lastAddedItem])

  const isVisible =
    lastAddedItem !== null && dismissedAt !== lastAddedItem.addedAt

  if (!lastAddedItem || !isVisible) {
    return null
  }

  return (
    <div
      dir="rtl"
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4"
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-[#617A55]/15 bg-[#25311f] px-5 py-3 text-sm font-medium text-[#F7F6F0] shadow-lg">
        <span aria-hidden="true" className="text-base">
          ✓
        </span>
        تمت إضافة {lastAddedItem.name} إلى السلة
      </div>
    </div>
  )
}

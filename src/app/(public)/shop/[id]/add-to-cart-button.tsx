'use client'

import { useEffect, useState } from 'react'
import { useCart } from '@/lib/cart/cart-context'

type Props = {
  productId: string
  variantId: string
  name: string
  price: number
  size: string | null
  color: string | null
  stock: number
  imageUrl: string | null
}

export default function AddToCartButton({
  productId,
  variantId,
  name,
  price,
  size,
  color,
  stock,
  imageUrl,
}: Props) {
  const { addToCart } = useCart()
  const [justAdded, setJustAdded] = useState(false)

  useEffect(() => {
    if (!justAdded) {
      return
    }
    const timeout = window.setTimeout(() => setJustAdded(false), 2500)
    return () => window.clearTimeout(timeout)
  }, [justAdded])

  if (stock <= 0) {
    return (
      <span className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#C7D6E8]/50 px-5 text-sm font-semibold text-[#617A55]/70">
        غير متوفر
      </span>
    )
  }

  function handleAdd() {
    addToCart({
      product_id: productId,
      variant_id: variantId,
      name,
      price,
      size,
      color,
      quantity: 1,
      image_url: imageUrl,
    })
    setJustAdded(true)
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleAdd}
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#617A55] px-5 text-sm font-semibold text-white transition hover:bg-[#4f6645]"
      >
        أضيفي إلى السلة
      </button>
      {justAdded && (
        <p className="text-sm font-medium text-[#617A55]">
          تمت الإضافة إلى السلة
        </p>
      )}
    </div>
  )
}

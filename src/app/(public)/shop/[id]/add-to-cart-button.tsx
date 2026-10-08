'use client'

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
  className?: string
  compact?: boolean
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
  className,
  compact = false,
}: Props) {
  const { addToCart } = useCart()

  if (stock <= 0) {
    return (
      <span
        className={
          className ??
          'inline-flex min-h-11 items-center justify-center rounded-full bg-[#C7D6E8]/50 px-5 text-sm font-semibold text-[#617A55]/70'
        }
      >
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
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      className={
        className ??
        `inline-flex items-center justify-center rounded-full bg-[#617A55] text-sm font-semibold text-white transition hover:bg-[#4f6645] ${compact ? 'min-h-10 px-4' : 'min-h-11 px-5'}`
      }
    >
      أضيفي إلى السلة
    </button>
  )
}

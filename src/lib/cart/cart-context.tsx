'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type CartItem = {
  product_id: string
  variant_id: string
  name: string
  price: number
  size: string | null
  color: string | null
  quantity: number
  image_url: string | null
}

type CartContextValue = {
  items: CartItem[]
  addToCart: (item: CartItem) => void
  removeFromCart: (variantId: string) => void
  updateQuantity: (variantId: string, quantity: number) => void
  clearCart: () => void
  totalPrice: number
  totalQuantity: number
}

const CART_STORAGE_KEY = 'ahlam-space-cart'

const CartContext = createContext<CartContextValue | null>(null)

function readCartFromStorage(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    // Storage unavailable (private browsing, disabled storage, corrupt
    // data, etc.) - fail gracefully to an empty in-memory cart.
    return []
  }
}

function writeCartToStorage(items: CartItem[]) {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Storage unavailable - the cart just stays in-memory for this session.
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isHydrated, setIsHydrated] = useState(false)

  // Load once on mount (client-only - localStorage doesn't exist during SSR,
  // and reading it during render would cause a hydration mismatch since the
  // server has no cart data to render). This is a one-time sync from an
  // external, browser-only source, not a cascading-render anti-pattern.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(readCartFromStorage())
    setIsHydrated(true)
  }, [])

  // Persist on every change, but only after the initial load above has run -
  // otherwise this would fire first (with the initial empty array) and
  // overwrite whatever was already saved before the load ever completes.
  useEffect(() => {
    if (!isHydrated) {
      return
    }
    writeCartToStorage(items)
  }, [items, isHydrated])

  function addToCart(item: CartItem) {
    setItems((current) => {
      const existing = current.find((i) => i.variant_id === item.variant_id)
      if (existing) {
        return current.map((i) =>
          i.variant_id === item.variant_id
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        )
      }
      return [...current, item]
    })
  }

  function removeFromCart(variantId: string) {
    setItems((current) => current.filter((i) => i.variant_id !== variantId))
  }

  function updateQuantity(variantId: string, quantity: number) {
    setItems((current) => {
      if (quantity <= 0) {
        return current.filter((i) => i.variant_id !== variantId)
      }
      return current.map((i) =>
        i.variant_id === variantId ? { ...i, quantity } : i
      )
    })
  }

  function clearCart() {
    setItems([])
  }

  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalPrice,
        totalQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

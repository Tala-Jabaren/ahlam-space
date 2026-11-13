export const publicRoutes = {
  scope: 'public',
  courses: '/courses',
  shop: '/shop',
  cart: '/cart',
  checkout: '/checkout',
  orders: '/orders',
} as const

export type ExperienceRoutes = { [Key in keyof typeof publicRoutes]: string }

export const memberRoutes: ExperienceRoutes = {
  scope: 'member',
  courses: '/member/courses',
  shop: '/member/shop',
  cart: '/member/cart',
  checkout: '/member/checkout',
  orders: '/orders',
}

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CartProvider } from '@/lib/cart/cart-context'
import PublicNavLink from './public-nav-link'
import CartNavLink from './cart-nav-link'
import CartBottomBar from './cart-bottom-bar'

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <CartProvider>
      <div className="min-h-screen bg-[#F7F6F0] text-[#25311f]">
        <nav className="sticky top-0 z-50 mx-auto flex max-w-7xl flex-col gap-5 border-b border-[#617A55]/15 bg-[#F7F6F0]/90 px-5 py-5 backdrop-blur sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <Link
            href="/"
            className="font-serif text-2xl tracking-wide text-[#617A55]"
          >
            Ahlam Space
          </Link>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-medium uppercase tracking-[0.18em] text-[#617A55]">
              <PublicNavLink href="/">
                Home
              </PublicNavLink>
              <PublicNavLink href="/about">
                About
              </PublicNavLink>
              <PublicNavLink href="/classes">
                Classes
              </PublicNavLink>
              <PublicNavLink href="/courses">
                كورسات ومحاضرات
              </PublicNavLink>
              <PublicNavLink href="/private-sessions">
                جلسات فردية
              </PublicNavLink>
              <PublicNavLink href="/shop">
                Shop
              </PublicNavLink>
              <PublicNavLink href="/contact">
                Contact
              </PublicNavLink>
            </div>
            <div className="flex items-center gap-3">
              <CartNavLink />
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#617A55] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4f6645]"
                href={user ? '/dashboard' : '/login'}
              >
                {user ? 'حسابي' : 'تسجيل الدخول'}
              </Link>
            </div>
          </div>
        </nav>
        <main>{children}</main>
        <CartBottomBar />
        <footer className="border-t border-[#617A55]/15 px-5 py-10 sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm text-[#617A55] sm:flex-row sm:items-center sm:justify-between">
            <p>Ahlam Space, Ramallah</p>
            <p>Yoga, fitness, dance, and mindful daily rituals.</p>
          </div>
        </footer>
      </div>
    </CartProvider>
  )
}

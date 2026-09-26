'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type PublicNavLinkProps = {
  href: string
  children: React.ReactNode
}

export default function PublicNavLink({
  href,
  children,
}: PublicNavLinkProps) {
  const pathname = usePathname()
  const isActive =
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={`relative isolate transition-[background-color,color] duration-200 ease-[ease] before:absolute before:-inset-x-3 before:-inset-y-1.5 before:-z-10 before:rounded-[9999px] before:transition-[background-color] before:duration-200 before:ease-[ease] ${
        isActive
          ? 'before:bg-[#D6E2B6]'
          : 'hover:text-[#25311f] hover:before:bg-[#D6E2B6]/35'
      }`}
    >
      {children}
    </Link>
  )
}

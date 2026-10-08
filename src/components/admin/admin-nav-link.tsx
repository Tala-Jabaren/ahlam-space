'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition ${
        isActive
          ? 'bg-[#617A55] text-[#F7F6F0]'
          : 'text-[#617A55] hover:bg-[#D6E2B6]/65'
      }`}
    >
      {children}
    </Link>
  )
}

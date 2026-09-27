'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type MemberNavLinkProps = {
  href: string
  label: string
  icon: string
  mobile?: boolean
}

export default function MemberNavLink({
  href,
  label,
  icon,
  mobile = false,
}: MemberNavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={
        mobile
          ? `flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-medium transition ${
              isActive ? 'bg-[#D6E2B6]/75' : 'hover:bg-[#D6E2B6]/70'
            }`
          : `flex min-h-12 items-center gap-4 rounded-lg px-4 text-base font-medium transition ${
              isActive
                ? 'bg-[#D6E2B6]/75 font-semibold text-[#617A55]'
                : 'hover:bg-[#D6E2B6]/70'
            }`
      }
    >
      <span
        aria-hidden="true"
        className={mobile ? 'text-lg leading-none' : 'grid size-7 place-items-center text-xl'}
      >
        {icon}
      </span>
      <span className={mobile ? 'max-w-full truncate' : undefined}>{label}</span>
    </Link>
  )
}

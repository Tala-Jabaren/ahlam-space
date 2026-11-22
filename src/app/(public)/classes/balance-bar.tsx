import Link from 'next/link'
import type { PackagePurchaseRow } from '@/lib/package-purchases'
import type { Dictionary } from '@/i18n/dictionaries'

function formatExpiry(value: string | null, locale: string) {
  if (!value) return null
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', timeZone: 'Asia/Jerusalem' }).format(new Date(value))
}

// Shown on both /classes tabs for a member with an active package - tapping
// it is just a plain navigation to the «باقات» tab, no client JS needed.
export default function BalanceBar({ purchase, locale, t }: { purchase: PackagePurchaseRow; locale: string; t: Dictionary }) {
  const copy = t.classes.packages
  const expiresLabel = formatExpiry(purchase.expires_at, locale)
  const text = expiresLabel
    ? copy.balance.replace('{remaining}', String(purchase.sessions_remaining)).replace('{date}', expiresLabel)
    : copy.balanceNoExpiry.replace('{remaining}', String(purchase.sessions_remaining))

  return (
    <Link
      href="/classes?view=packages"
      className="mb-6 flex min-h-11 items-center justify-between gap-2 rounded-full bg-[#617A55] px-5 py-2.5 text-sm font-semibold text-[#F7F6F0] transition hover:bg-[#617A55]/90"
    >
      <span>{text}</span>
      <span aria-hidden="true">‹</span>
    </Link>
  )
}

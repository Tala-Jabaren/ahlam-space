import Link from 'next/link'
import type { PackagePurchaseRow } from '@/lib/package-purchases'
import type { Dictionary } from '@/i18n/dictionaries'

function formatExpiry(value: string | null, locale: string) {
  if (!value) return null
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', timeZone: 'Asia/Jerusalem' }).format(new Date(value))
}

// Compact banner shown only on the «حصة واحدة» tab for a member with an
// active package - the full balance block (Screen 3's green card) lives
// in the «باقات» tab instead (see my-packages-panel.tsx), so this one
// stays a quiet summary rather than duplicating it. Tapping it is just a
// plain navigation to the «باقات» tab, no client JS needed.
export default function BalanceBar({ purchase, locale, t }: { purchase: PackagePurchaseRow; locale: string; t: Dictionary }) {
  const copy = t.classes.packages
  const expiresLabel = formatExpiry(purchase.expires_at, locale)
  const subText = expiresLabel
    ? copy.balanceCompactSub.replace('{name}', purchase.class_packages?.name ?? '').replace('{date}', expiresLabel)
    : copy.balanceCompactSubNoExpiry.replace('{name}', purchase.class_packages?.name ?? '')

  return (
    <Link
      href="/classes?view=packages"
      className="mb-6 flex items-center justify-between gap-3 rounded-2xl bg-[#E4ECE6] p-3 sm:p-3.5"
    >
      <span className="min-w-0">
        <span className="block text-[16px] font-bold text-[#25402F]">
          {copy.balanceCompact.replace('{remaining}', String(purchase.sessions_remaining))}
        </span>
        <span className="mt-0.5 block truncate text-[13px] text-[#5C574F]">{subText}</span>
      </span>
      <span aria-hidden="true" className="shrink-0 text-[#25402F]">‹</span>
    </Link>
  )
}

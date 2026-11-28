import Link from 'next/link'
import type { PackagePurchaseRow } from '@/lib/package-purchases'
import type { Dictionary } from '@/i18n/dictionaries'

export default function ActivePackageCard({ purchase, locale, t }: { purchase: PackagePurchaseRow; locale: string; t: Dictionary }) {
  const copy = t.classes.packages
  const expiresLabel = purchase.expires_at
    ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jerusalem' }).format(new Date(purchase.expires_at))
    : null
  const segments = Array.from({ length: purchase.sessions_total }, (_, index) => index < purchase.sessions_remaining)

  return (
    <article className="w-full max-w-xl rounded-2xl bg-[#3F6350] p-4 text-white">
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 break-words text-base font-bold">{purchase.class_packages?.name ?? (locale === 'ar' ? 'باقة' : 'Package')}</h2>
        <span className="shrink-0 rounded-full bg-[#E1EEE5] px-2.5 py-0.5 text-xs font-semibold text-[#25513A]">
          {copy.statusActive}
        </span>
      </div>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-sm">
        <bdi className="text-2xl font-bold leading-none">{purchase.sessions_remaining}</bdi>
        <span>{copy.balanceCaption.replace('{total}', String(purchase.sessions_total))}</span>
      </p>
      <div className="mt-2 flex gap-1" aria-hidden="true">
        {segments.map((filled, index) => (
          <span key={index} className={`h-1.5 flex-1 rounded-full ${filled ? 'bg-white' : 'bg-white/35'}`} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        {expiresLabel && <p className="text-xs leading-5 text-white/90">{copy.expiresOnPackage.replace('{date}', expiresLabel)}</p>}
        <Link
          href="/member-schedule#sessions-list"
          className="ms-auto inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-3 text-sm font-bold text-[#25402F] transition hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {copy.bookWithPackage}
        </Link>
      </div>
    </article>
  )
}

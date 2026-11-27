'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import type { PackagePurchaseRow, PackagePurchaseSummary } from '@/lib/package-purchases'
import type { Dictionary } from '@/i18n/dictionaries'
import PackagePaymentSheet from './package-payment-sheet'

function formatAmount(value: number, locale: string) {
  return `${new Intl.NumberFormat(locale).format(value)} ₪`
}

function formatDate(value: string | null, locale: string) {
  if (!value) return null
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jerusalem' }).format(new Date(value))
}

// Screen 3's full block: bg #3F6350, white text - the big remaining
// number stands alone (not folded into one sentence) so it reads at a
// glance, matching the approved design exactly.
function ActivePackageCard({ purchase, locale, t }: { purchase: PackagePurchaseRow; locale: string; t: Dictionary }) {
  const copy = t.classes.packages
  const expiresLabel = formatDate(purchase.expires_at, locale)
  const segments = Array.from({ length: purchase.sessions_total }, (_, index) => index < purchase.sessions_remaining)

  return (
    <article className="rounded-[20px] bg-[#3F6350] p-5 text-white">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[18px] font-bold">{purchase.class_packages?.name ?? 'باقة'}</h3>
        <span className="rounded-full bg-[#E1EEE5] px-3 py-1 text-xs font-semibold text-[#25513A]">{copy.statusActive}</span>
      </div>
      <p className="mt-3 text-[56px] font-bold leading-none"><bdi>{purchase.sessions_remaining}</bdi></p>
      <p className="mt-1 text-[17px]">{copy.balanceCaption.replace('{total}', String(purchase.sessions_total))}</p>
      <div className="mt-4 flex gap-1.5" aria-hidden="true">
        {segments.map((filled, index) => (
          <span key={index} className={`h-2.5 flex-1 rounded-full ${filled ? 'bg-white' : 'bg-white/30'}`} />
        ))}
      </div>
      {expiresLabel && <p className="mt-3 text-[15px]">{copy.expiresOnPackage.replace('{date}', expiresLabel)}</p>}
      <Link
        href="/member-schedule#sessions-list"
        className="mt-5 inline-flex min-h-[50px] w-full items-center justify-center rounded-xl bg-white px-6 text-[17px] font-bold text-[#25402F] transition hover:bg-white/90"
      >
        {copy.bookWithPackage}
      </Link>
    </article>
  )
}

// «تفاصيل الدفع» opens the same payment sheet (Screen 2) the purchase
// flow itself shows, rather than an inline accordion - one payment-info
// surface, reused, not duplicated.
function PendingPurchaseRow({ purchase, locale, t }: { purchase: PackagePurchaseRow; locale: string; t: Dictionary }) {
  const copy = t.classes.packages
  const [open, setOpen] = useState(false)
  return (
    <article className="rounded-2xl border border-[#E8E2D8] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[16px] font-bold text-[#2B2A27]">{purchase.class_packages?.name ?? 'باقة'}</span>
        <span className="rounded-full bg-[#F6E7C9] px-3 py-1 text-xs font-semibold text-[#6B4A0B]">{t.classCards.pending}</span>
      </div>
      <p className="mt-2 text-[14px] leading-6 text-[#5C574F]">
        {copy.pendingOrderLine.replace('{reference}', purchase.reference).replace('{amount}', formatAmount(purchase.price_snapshot, locale))}
      </p>
      <button type="button" onClick={() => setOpen(true)} className="mt-2 text-[14px] font-semibold text-[#3F6350] underline underline-offset-4">
        {copy.paymentDetailsToggle}
      </button>
      {open && (
        <PackagePaymentSheet
          packageName={purchase.class_packages?.name ?? 'باقة'}
          sessionsCount={purchase.sessions_total}
          price={purchase.price_snapshot}
          reference={purchase.reference}
          onClose={() => setOpen(false)}
        />
      )}
    </article>
  )
}

function ClosedPurchaseRow({ purchase, locale, t }: { purchase: PackagePurchaseRow; locale: string; t: Dictionary }) {
  const copy = t.classes.packages
  const label = purchase.status === 'cancelled' ? copy.statusCancelled : copy.statusExpired
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E8E2D8] py-3 text-[14px] first:border-t-0">
      <span className="text-[#2B2A27]">{purchase.class_packages?.name ?? 'باقة'}</span>
      <span className="flex items-center gap-3 text-[#5C574F]">
        <bdi>{formatAmount(purchase.price_snapshot, locale)}</bdi>
        <span className="rounded-full bg-[#ECEAE6] px-2.5 py-0.5 text-xs font-semibold text-[#55524C]">{label}</span>
      </span>
    </div>
  )
}

// Rendered at the top of the «باقات» tab for a logged-in member - her
// active package, any purchases still awaiting payment, and a collapsed
// history of closed (expired/cancelled) ones. Everything below the
// package catalog grid, which renders unconditionally after this.
export default function MyPackagesPanel({ summary, locale, t }: { summary: PackagePurchaseSummary; locale: string; t: Dictionary }) {
  const copy = t.classes.packages
  if (!summary.all.length) return null

  return (
    <div className="mb-8 grid gap-3.5">
      {summary.active && <ActivePackageCard purchase={summary.active} locale={locale} t={t} />}
      {summary.pending.map(purchase => (
        <PendingPurchaseRow key={purchase.id} purchase={purchase} locale={locale} t={t} />
      ))}
      {summary.closed.length > 0 && (
        <details className="group rounded-2xl border border-[#E8E2D8] bg-white p-4 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-[15px] font-semibold text-[#2B2A27]">
            {copy.expiredSection.replace('{count}', String(summary.closed.length))}
            <ChevronDown aria-hidden="true" className="size-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
          </summary>
          <div className="mt-2">
            {summary.closed.map(purchase => (
              <ClosedPurchaseRow key={purchase.id} purchase={purchase} locale={locale} t={t} />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

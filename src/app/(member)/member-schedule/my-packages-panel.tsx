'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { PackagePurchaseRow, PackagePurchaseSummary } from '@/lib/package-purchases'
import type { Dictionary } from '@/i18n/dictionaries'
import PackagePaymentSheet from './package-payment-sheet'

function formatAmount(value: number, locale: string) {
  return `${new Intl.NumberFormat(locale).format(value)} ₪`
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
      <button type="button" onClick={() => setOpen(true)} className="mt-2 text-[14px] font-semibold text-[#617A55] underline underline-offset-4">
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

export default function MyPackagesPanel({ summary, locale, t }: { summary: PackagePurchaseSummary; locale: string; t: Dictionary }) {
  const copy = t.classes.packages
  if (!summary.pending.length && !summary.closed.length) return null

  return (
    <div className="mb-8 grid gap-3.5">
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

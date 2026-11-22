import Link from 'next/link'
import type { PackagePurchaseRow, PackagePurchaseSummary } from '@/lib/package-purchases'
import type { Dictionary } from '@/i18n/dictionaries'
import PaymentConfirmationBlock from '@/components/payment-confirmation-block'

function formatAmount(value: number, locale: string) {
  return `${new Intl.NumberFormat(locale).format(value)} ₪`
}

function formatDate(value: string | null, locale: string) {
  if (!value) return null
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jerusalem' }).format(new Date(value))
}

function ActivePackageCard({ purchase, locale, t }: { purchase: PackagePurchaseRow; locale: string; t: Dictionary }) {
  const copy = t.classes.packages
  const expiresLabel = formatDate(purchase.expires_at, locale)
  const segments = Array.from({ length: purchase.sessions_total }, (_, index) => index < purchase.sessions_remaining)

  return (
    <article className="rounded-2xl border border-[#617A55]/14 bg-white p-6 shadow-[0_1px_2px_rgba(37,49,31,0.04)]">
      <h3 className="font-serif text-2xl text-[#25311f]">{purchase.class_packages?.name ?? 'باقة'}</h3>
      <p className="mt-2 text-sm font-semibold text-[#25311f]">
        {copy.remainingOf.replace('{remaining}', String(purchase.sessions_remaining)).replace('{total}', String(purchase.sessions_total))}
      </p>
      <div className="mt-3 flex gap-1.5" aria-hidden="true">
        {segments.map((filled, index) => (
          <span key={index} className={`h-2 flex-1 rounded-full ${filled ? 'bg-[#617A55]' : 'bg-[#617A55]/15'}`} />
        ))}
      </div>
      {expiresLabel && <p className="mt-3 text-sm text-[#617A55]/75">{copy.expiresOn.replace('{date}', expiresLabel)}</p>}
      <Link
        href="/classes#sessions-list"
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#617A55] px-6 text-sm font-semibold text-white transition hover:bg-[#617A55]/85"
      >
        {copy.bookWithPackage}
      </Link>
    </article>
  )
}

function PendingPurchaseRow({ purchase, t }: { purchase: PackagePurchaseRow; t: Dictionary }) {
  const copy = t.classes.packages
  return (
    <details className="rounded-2xl border border-[#617A55]/14 bg-white p-5 open:pb-6 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-3 text-sm">
        <span className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#C7D6E8] px-3 py-1 text-xs font-semibold text-[#617A55]">{t.classCards.pending}</span>
          <span className="font-serif text-lg text-[#25311f]">{purchase.class_packages?.name ?? 'باقة'}</span>
          <strong className="font-mono text-[#617A55]/80" dir="ltr">{purchase.reference}</strong>
        </span>
        <span className="text-[#617A55] underline">{copy.paymentDetailsToggle}</span>
      </summary>
      <div className="mt-4">
        <PaymentConfirmationBlock amount={purchase.price_snapshot} reference={purchase.reference} />
        <div className="mt-3 rounded-lg border border-[#617A55]/15 bg-[#F7F6F0] p-4 text-sm leading-7 text-[#25311f]">
          <p className="font-semibold">{copy.payAtStudioTitle}</p>
          <p className="mt-1">
            {copy.payAtStudioBody}{' '}
            <strong className="font-mono" dir="ltr">{purchase.reference}</strong>
          </p>
        </div>
      </div>
    </details>
  )
}

function ClosedPurchaseRow({ purchase, locale, t }: { purchase: PackagePurchaseRow; locale: string; t: Dictionary }) {
  const copy = t.classes.packages
  const label = purchase.status === 'cancelled' ? copy.statusCancelled : copy.statusExpired
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#617A55]/10 py-3 text-sm first:border-t-0">
      <span className="text-[#25311f]">{purchase.class_packages?.name ?? 'باقة'}</span>
      <span className="flex items-center gap-3 text-[#617A55]/70">
        <bdi>{formatAmount(purchase.price_snapshot, locale)}</bdi>
        <span className="rounded-full bg-[#617A55]/10 px-2.5 py-0.5 text-xs font-semibold">{label}</span>
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
    <div className="mb-10 grid gap-4">
      {summary.active && <ActivePackageCard purchase={summary.active} locale={locale} t={t} />}
      {summary.pending.map(purchase => (
        <PendingPurchaseRow key={purchase.id} purchase={purchase} t={t} />
      ))}
      {summary.closed.length > 0 && (
        <details className="rounded-2xl border border-[#617A55]/14 bg-white p-5 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-[#617A55]">
            {copy.expiredSection.replace('{count}', String(summary.closed.length))}
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

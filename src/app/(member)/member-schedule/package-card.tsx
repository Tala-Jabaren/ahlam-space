import { packageSavings, perSessionPrice, SINGLE_SESSION_PRICE } from '@/lib/package-pricing'
import BuyPackageButton from './buy-package-button'

export type PackageCardData = {
  id: string
  name: string
  description: string | null
  sessionsCount: number
  price: number
  validityDays: number | null
}

export type PackageCardCopy = {
  sessionsLabel: string
  perSessionLabel: string
  savings: string
  validity: string
  buy: string
  perSessionPriceLine: string
  sessionsFreelyChosen: string
  validMonthFromConfirm: string
}

function formatAmount(value: number) {
  return `${new Intl.NumberFormat('ar').format(value)} ₪`
}

// A month, give or take (28-31 days) reads as "صالحة شهراً" per the design -
// anything else falls back to the existing generic "{days} يوم" phrasing,
// so a future package with a different validity window still renders
// sensible text instead of a wrong "month" claim.
function isAboutAMonth(days: number) {
  return days >= 28 && days <= 31
}

// Exact design match: name + savings chip, big price + per-session line,
// two check-marked lines, full-width button - replaces the previous
// dt/dl-based layout entirely. Member-only (see the packages tab inside
// /member-schedule) - always authenticated, so there's no logged-out
// variant to render here.
export default function PackageCard({
  pkg,
  copy,
}: {
  pkg: PackageCardData
  locale: string
  copy: PackageCardCopy
}) {
  const perSession = perSessionPrice(pkg.price, pkg.sessionsCount)
  const savings = packageSavings(pkg.price, pkg.sessionsCount)

  return (
    <article className="flex min-w-0 flex-col gap-3.5 rounded-[18px] border border-[#E8E2D8] bg-white p-[18px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[22px] font-bold text-[#2B2A27]">{pkg.name}</h3>
        {savings != null && (
          <span className="shrink-0 rounded-full bg-[#E1EEE5] px-3 py-1 text-xs font-semibold text-[#25513A]">
            {copy.savings.replace('{amount}', formatAmount(savings))}
          </span>
        )}
      </div>

      <div>
        <p className="text-[36px] font-bold leading-none text-[#25402F]"><bdi>{formatAmount(pkg.price)}</bdi></p>
        <p className="mt-1.5 text-[15px] text-[#5C574F]">
          {copy.perSessionPriceLine.replace('{amount}', formatAmount(perSession)).replace('{single}', formatAmount(SINGLE_SESSION_PRICE))}
        </p>
      </div>

      <ul className="grid gap-1.5 text-[15px] text-[#2B2A27]">
        <li className="flex items-center gap-2">
          <CheckIcon />
          {copy.sessionsFreelyChosen.replace('{count}', String(pkg.sessionsCount))}
        </li>
        <li className="flex items-center gap-2">
          <CheckIcon />
          {pkg.validityDays != null && isAboutAMonth(pkg.validityDays)
            ? copy.validMonthFromConfirm
            : pkg.validityDays != null
              ? copy.validity.replace('{days}', String(pkg.validityDays))
              : null}
        </li>
      </ul>

      <BuyPackageButton packageId={pkg.id} packageName={pkg.name} sessionsCount={pkg.sessionsCount} price={pkg.price} buyLabel={copy.buy} />
    </article>
  )
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 shrink-0 text-[#3F6350]">
      <path fill="currentColor" d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.8 6.8-6.8a1 1 0 0 1 1.4 0Z" />
    </svg>
  )
}

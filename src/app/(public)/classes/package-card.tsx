import { packageSavings, perSessionPrice } from '@/lib/package-pricing'
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
  loginToBuy: string
}

function formatCurrency(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 2,
  }).format(value)
}

// Same card shell/typography as class-card.tsx (white surface, rounded
// corners, sage border, serif heading) so a package reads as part of the
// same catalog, not a separate design.
export default function PackageCard({
  pkg,
  locale,
  isLoggedIn,
  loginHref,
  copy,
}: {
  pkg: PackageCardData
  locale: string
  isLoggedIn: boolean
  loginHref: string
  copy: PackageCardCopy
}) {
  const perSession = perSessionPrice(pkg.price, pkg.sessionsCount)
  const savings = packageSavings(pkg.price, pkg.sessionsCount)

  return (
    <article className="flex min-w-0 flex-col rounded-2xl border border-[#617A55]/14 bg-white p-6 shadow-[0_1px_2px_rgba(37,49,31,0.04)]">
      <h3 className="font-serif text-2xl text-[#25311f]">{pkg.name}</h3>
      {pkg.description && (
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#617A55]/80">{pkg.description}</p>
      )}

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[#617A55]/12 pt-5 text-sm">
        <div>
          <dt className="text-[#617A55]/70">{copy.sessionsLabel}</dt>
          <dd className="mt-1 font-serif text-lg font-semibold text-[#25311f]">{pkg.sessionsCount}</dd>
        </div>
        <div>
          <dt className="text-[#617A55]/70">{copy.perSessionLabel}</dt>
          <dd className="mt-1 font-serif text-lg font-semibold text-[#25311f]">
            <bdi>{formatCurrency(perSession, locale)}</bdi>
          </dd>
        </div>
        {pkg.validityDays != null && (
          <div className="col-span-2">
            <dt className="text-[#617A55]/70">{copy.validity.replace('{days}', String(pkg.validityDays))}</dt>
          </div>
        )}
      </dl>

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="font-serif text-2xl font-semibold text-[#25311f]">
          <bdi>{formatCurrency(pkg.price, locale)}</bdi>
        </p>
        {savings != null && (
          <span className="rounded-full bg-[#D6E2B6]/70 px-3 py-1 text-xs font-semibold text-[#3f5233]">
            {copy.savings.replace('{amount}', formatCurrency(savings, locale))}
          </span>
        )}
      </div>

      <div className="mt-5">
        {isLoggedIn ? (
          <BuyPackageButton packageId={pkg.id} price={pkg.price} buyLabel={copy.buy} />
        ) : (
          <a
            href={loginHref}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#617A55] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#617A55]/85"
          >
            {copy.loginToBuy}
          </a>
        )}
      </div>
    </article>
  )
}

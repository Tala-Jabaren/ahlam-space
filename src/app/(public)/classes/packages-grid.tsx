import PackageCard, { type PackageCardCopy, type PackageCardData } from './package-card'

export default function PackagesGrid({
  packages,
  locale,
  isLoggedIn,
  loginHref,
  copy,
  emptyLabel,
}: {
  packages: PackageCardData[]
  locale: string
  isLoggedIn: boolean
  loginHref: string
  copy: PackageCardCopy
  emptyLabel: string
}) {
  if (packages.length === 0) {
    return <p className="rounded-lg bg-[#C7D6E8]/35 p-6 text-center text-sm leading-7 text-[#4f5d49]">{emptyLabel}</p>
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {packages.map(pkg => (
        <PackageCard key={pkg.id} pkg={pkg} locale={locale} isLoggedIn={isLoggedIn} loginHref={loginHref} copy={copy} />
      ))}
    </div>
  )
}

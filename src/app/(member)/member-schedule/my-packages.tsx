import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Dictionary } from '@/i18n/dictionaries'
import PaymentConfirmationBlock from '@/components/payment-confirmation-block'

type PurchaseRow = {
  id: string
  status: string
  reference: string
  price_snapshot: number
  sessions_total: number
  sessions_remaining: number
  payment_method: string | null
  created_at: string | null
  paid_at: string | null
  expires_at: string | null
  class_packages: { name: string; description: string | null } | null
}

function formatAmount(value: number, locale: string) {
  return `${new Intl.NumberFormat(locale).format(value)} ₪`
}

function formatDate(value: string | null, locale: string) {
  if (!value) return null
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jerusalem' }).format(new Date(value))
}

function statusInfo(purchase: PurchaseRow, t: Dictionary) {
  if (purchase.status === 'cancelled') return { label: t.memberSchedule.myPackages.statusCancelled, tone: 'bg-[#617A55]/10 text-[#617A55]/70' }
  if (purchase.status !== 'paid') return { label: t.memberSchedule.myPackages.statusPending, tone: 'bg-[#C7D6E8] text-[#617A55]' }
  const expired = purchase.expires_at ? new Date(purchase.expires_at).getTime() < Date.now() : false
  if (expired || purchase.sessions_remaining <= 0) return { label: t.memberSchedule.myPackages.statusExpired, tone: 'bg-[#617A55]/10 text-[#617A55]/70' }
  return { label: t.memberSchedule.myPackages.statusActive, tone: 'bg-[#617A55] text-[#F7F6F0]' }
}

// Same content/layout the standalone /packages page used to render -
// moved here so it lives as a tab of /member-schedule instead of its own
// nav item, per the request to keep packages alongside classes like the
// public /classes page does.
export default async function MyPackages({ userId, locale, t }: { userId: string; locale: string; t: Dictionary }) {
  const supabase = await createClient()
  const { data: purchases, error } = await supabase
    .from('package_purchases')
    .select('id, status, reference, price_snapshot, sessions_total, sessions_remaining, payment_method, created_at, paid_at, expires_at, class_packages(name, description)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .returns<PurchaseRow[]>()

  if (error) console.error('Failed to load package purchases:', error.message)
  const copy = t.memberSchedule.myPackages

  return (
    <div>
      {error && (
        <div className="mt-7 rounded-lg bg-[#C7D6E8]/55 p-6 text-center">{copy.loadError}</div>
      )}

      {!error && (purchases ?? []).length === 0 && (
        <div className="mt-7 rounded-lg bg-[#C7D6E8]/40 p-8 text-center">
          <p className="font-serif text-2xl">{copy.empty}</p>
          <Link href="/classes?view=packages" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#617A55] px-7 py-3 text-sm font-semibold text-[#F7F6F0] transition hover:bg-[#617A55]/85">
            {copy.browse}
          </Link>
        </div>
      )}

      {!error && (purchases ?? []).length > 0 && (
        <div className="mt-7 grid gap-5">
          {(purchases ?? []).map((purchase) => {
            const status = statusInfo(purchase, t)
            const expiresLabel = formatDate(purchase.expires_at, locale)
            return (
              <article key={purchase.id} className="overflow-hidden rounded-lg border border-[#617A55]/10 bg-[#F7F6F0] p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-words font-serif text-2xl text-[#25311f]">{purchase.class_packages?.name ?? 'باقة'}</h2>
                    {purchase.class_packages?.description && (
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#617A55]/75">{purchase.class_packages.description}</p>
                    )}
                  </div>
                  <span className={`inline-flex min-h-10 shrink-0 items-center self-start rounded-full px-4 text-sm font-semibold ${status.tone}`}>
                    {status.label}
                  </span>
                </div>

                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-[#617A55]/70">{copy.remainingLabel}</dt>
                    <dd className="mt-1 font-semibold text-[#25311f]">{purchase.sessions_remaining} / {purchase.sessions_total}</dd>
                  </div>
                  <div>
                    <dt className="text-[#617A55]/70">{copy.amountLabel}</dt>
                    <dd className="mt-1 font-semibold text-[#25311f]"><bdi>{formatAmount(purchase.price_snapshot, locale)}</bdi></dd>
                  </div>
                  {expiresLabel && (
                    <div>
                      <dt className="text-[#617A55]/70">{copy.expiresLabel}</dt>
                      <dd className="mt-1 font-semibold text-[#25311f]">{expiresLabel}</dd>
                    </div>
                  )}
                </dl>

                {purchase.status === 'pending' && (
                  <div className="mt-5">
                    <PaymentConfirmationBlock amount={purchase.price_snapshot} reference={purchase.reference} />
                    <div className="mt-3 rounded-lg border border-[#617A55]/15 bg-white p-4 text-sm leading-7 text-[#25311f]">
                      <p className="font-semibold">{t.classes.packages.payAtStudioTitle}</p>
                      <p className="mt-1">
                        {t.classes.packages.payAtStudioBody}{' '}
                        <strong className="font-mono" dir="ltr">{purchase.reference}</strong>
                      </p>
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

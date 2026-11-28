'use client'

import { useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { PackagePurchaseRow, PackagePurchaseSummary } from '@/lib/package-purchases'
import type { Dictionary } from '@/i18n/dictionaries'
import PackagePaymentSheet from './package-payment-sheet'

function formatAmount(value: number, locale: string) {
  return `${new Intl.NumberFormat(locale).format(value)} ₪`
}

// «تفاصيل الدفع» opens the same payment sheet (Screen 2) the purchase
// flow itself shows, rather than an inline accordion - one payment-info
// surface, reused, not duplicated.
function PendingPurchaseRow({ purchase, locale, t, onCancelled }: {
  purchase: PackagePurchaseRow
  locale: string
  t: Dictionary
  onCancelled: () => void
}) {
  const copy = t.classes.packages
  const [open, setOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const canCancel = purchase.status === 'pending' && !purchase.paid_at

  async function confirmCancellation() {
    if (cancelling || !canCancel) return
    setCancelling(true)
    setCancelError('')
    try {
      const { data, error } = await createClient().rpc('cancel_pending_package_purchase', { p_purchase_id: purchase.id })
      if (error) throw error
      if (data !== true) {
        setCancelError(copy.cancelPurchaseUnavailable)
        return
      }
      dialog.current?.close()
      onCancelled()
    } catch {
      setCancelError(copy.cancelPurchaseError)
    } finally {
      setCancelling(false)
    }
  }

  return (
    <article className="rounded-2xl border border-[#E8E2D8] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[16px] font-bold text-[#2B2A27]">{purchase.class_packages?.name ?? 'باقة'}</span>
        <span className="rounded-full bg-[#F6E7C9] px-3 py-1 text-xs font-semibold text-[#6B4A0B]">{t.classCards.pending}</span>
      </div>
      <p className="mt-2 text-[14px] leading-6 text-[#5C574F]">
        {copy.pendingOrderLine.replace('{reference}', purchase.reference).replace('{amount}', formatAmount(purchase.price_snapshot, locale))}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-x-5">
        <button type="button" onClick={() => setOpen(true)} className="min-h-11 text-sm font-semibold text-[#617A55] underline underline-offset-4">
          {copy.paymentDetailsToggle}
        </button>
        {canCancel && (
          <button
            type="button"
            aria-haspopup="dialog"
            disabled={cancelling}
            className="min-h-11 text-sm font-semibold text-red-800 underline underline-offset-4 disabled:opacity-60"
            onClick={() => { setCancelError(''); dialog.current?.showModal() }}
          >
            {copy.cancelPurchase}
          </button>
        )}
      </div>
      {canCancel && (
        <dialog
          ref={dialog}
          aria-labelledby={titleId}
          onCancel={(event) => { if (cancelling) event.preventDefault() }}
          className="m-auto w-[calc(100%_-_2rem)] max-w-sm rounded-2xl border border-[#617A55]/20 bg-[#F7F6F0] p-5 text-[#25311f] backdrop:bg-black/40"
        >
          <h3 id={titleId} className="font-serif text-xl font-semibold">{copy.cancelPurchasePrompt}</h3>
          {cancelError && <p role="alert" className="mt-3 text-sm text-red-800">{cancelError}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={cancelling} onClick={() => dialog.current?.close()} className="min-h-11 rounded-lg border border-[#617A55]/30 px-4 text-sm font-semibold text-[#465d3d] disabled:opacity-60">
              {copy.cancelPurchaseKeep}
            </button>
            <button type="button" disabled={cancelling} onClick={confirmCancellation} className="min-h-11 rounded-lg bg-red-800 px-4 text-sm font-semibold text-white hover:bg-red-900 disabled:opacity-60">
              {cancelling ? t.classCards.cancelLoading : t.classCards.cancelConfirm}
            </button>
          </div>
        </dialog>
      )}
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
  const router = useRouter()
  const [notice, setNotice] = useState('')
  if (!summary.pending.length && !summary.closed.length) return null

  return (
    <div className="mb-8 grid gap-3.5">
      {notice && <p role="status" className="rounded-lg bg-[#D6E2B6]/45 p-3 text-sm text-[#465d3d]">{notice}</p>}
      {summary.pending.map(purchase => (
        <PendingPurchaseRow key={purchase.id} purchase={purchase} locale={locale} t={t} onCancelled={() => {
          setNotice(copy.cancelPurchaseSuccess)
          router.refresh()
        }} />
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

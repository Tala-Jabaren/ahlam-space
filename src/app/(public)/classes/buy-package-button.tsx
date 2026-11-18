'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/i18n/i18n-context'
import PaymentConfirmationBlock from '@/components/payment-confirmation-block'

const buttonStyle =
  'inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#617A55] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#617A55]/85 disabled:cursor-not-allowed disabled:opacity-50'

type State = 'idle' | 'saving' | 'error'

// Creates a pending package_purchases row (create_package_purchase RPC -
// see supabase/class-packages.sql) and, on success, shows both ways to pay
// as plain instructions rather than a method picker: which one she
// actually used is recorded later by the admin on confirmation (same
// "admin picks payment_method" design as the SQL's own comment explains),
// not chosen here. Bank transfer reuses PaymentConfirmationBlock exactly
// as bookings/course purchases already do; "pay at the studio" is new,
// just the same reference number with different instructions.
export default function BuyPackageButton({
  packageId,
  price,
  buyLabel,
}: {
  packageId: string
  price: number
  buyLabel: string
}) {
  const { t, dir } = useT()
  const copy = t.classes.packages
  const [state, setState] = useState<State>('idle')
  const [reference, setReference] = useState<string | null>(null)

  async function handleBuy() {
    setState('saving')
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setState('error')
        return
      }

      const { data, error } = await supabase.rpc('create_package_purchase', {
        p_package_id: packageId,
        p_user_id: user.id,
      })

      if (error || !data?.reference) {
        console.error('create_package_purchase failed:', error?.message)
        setState('error')
        return
      }

      setReference(data.reference as string)
    } catch (err) {
      console.error('create_package_purchase failed:', err)
      setState('error')
    }
  }

  if (reference) {
    return (
      <div dir={dir} className="space-y-4">
        <p role="status" className="font-serif text-lg text-[#25311f]">
          {copy.purchasedTitle}
        </p>
        <PaymentConfirmationBlock amount={price} reference={reference} />
        <div className="rounded-lg border border-[#617A55]/15 bg-[#F7F6F0] p-4 text-sm leading-7 text-[#25311f]">
          <p className="font-semibold">{copy.payAtStudioTitle}</p>
          <p className="mt-1">
            {copy.payAtStudioBody}{' '}
            <strong className="font-mono" dir="ltr">
              {reference}
            </strong>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <button type="button" onClick={handleBuy} disabled={state === 'saving'} className={buttonStyle}>
        {state === 'saving' ? copy.buying : buyLabel}
      </button>
      {state === 'error' && (
        <p role="alert" className="mt-2 text-sm leading-6 text-red-700">
          {copy.error}
        </p>
      )}
    </div>
  )
}

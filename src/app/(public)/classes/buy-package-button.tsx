'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/i18n/i18n-context'
import PackagePaymentSheet from './package-payment-sheet'

const buttonStyle =
  'inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#617A55] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#617A55]/85 disabled:cursor-not-allowed disabled:opacity-50'

type State = 'idle' | 'saving' | 'error'

// Creates a pending package_purchases row (create_package_purchase RPC -
// see supabase/class-packages.sql) and, on success, opens the payment
// sheet with both ways to pay as plain instructions rather than a method
// picker: which one she actually used is recorded later by the admin on
// confirmation (same "admin picks payment_method" design as the SQL's own
// comment explains), not chosen here.
export default function BuyPackageButton({
  packageId,
  packageName,
  sessionsCount,
  price,
  buyLabel,
}: {
  packageId: string
  packageName: string
  sessionsCount: number
  price: number
  buyLabel: string
}) {
  const { t } = useT()
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
      setState('idle')
    } catch (err) {
      console.error('create_package_purchase failed:', err)
      setState('error')
    }
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
      {reference && (
        <PackagePaymentSheet
          packageName={packageName}
          sessionsCount={sessionsCount}
          price={price}
          reference={reference}
          onClose={() => setReference(null)}
        />
      )}
    </div>
  )
}

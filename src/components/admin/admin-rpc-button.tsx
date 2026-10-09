'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type RpcName =
  | 'admin_confirm_payment'
  | 'admin_cancel_order'
  | 'expire_unpaid_orders'

type AdminRpcButtonProps = {
  rpcName: RpcName
  args: Record<string, string | number>
  label: string
  confirmMessage: string
  successMessage: string
  tone?: 'primary' | 'danger' | 'secondary'
  disabled?: boolean
}

export default function AdminRpcButton({
  rpcName,
  args,
  label,
  confirmMessage,
  successMessage,
  tone = 'primary',
  disabled = false,
}: AdminRpcButtonProps) {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const [isPending, setIsPending] = useState(false)

  async function handleClick() {
    if (!window.confirm(confirmMessage)) return

    setIsPending(true)
    setMessage(null)
    setIsError(false)

    const supabase = createClient()
    const { error } = await supabase.rpc(rpcName, args)

    if (error) {
      console.error(`${rpcName} failed:`, error.message)
      setIsError(true)
      setMessage('تعذر تنفيذ العملية. تأكدي من الصلاحيات وحاولي مرة أخرى.')
      setIsPending(false)
      return
    }

    setMessage(successMessage)
    setIsPending(false)
    router.refresh()
  }

  const toneClass = {
    primary: 'bg-[#617A55] text-[#F7F6F0] hover:bg-[#526849]',
    danger:
      'border border-[#617A55]/35 bg-white text-[#617A55] hover:bg-[#C7D6E8]/35',
    secondary: 'bg-[#C7D6E8] text-[#25311f] hover:bg-[#C7D6E8]/75',
  }[tone]

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isPending}
        className={`inline-flex min-h-11 w-full items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${toneClass}`}
      >
        {isPending ? 'جارٍ التنفيذ...' : label}
      </button>
      {message && (
        <p
          role="status"
          className={`mt-2 max-w-sm text-sm leading-6 ${
            isError ? 'text-[#25311f]' : 'text-[#617A55]'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  )
}

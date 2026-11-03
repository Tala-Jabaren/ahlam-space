'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const messages: Record<string, string> = {
  FORBIDDEN: 'ليست لديك صلاحية لتنفيذ هذا الإجراء.',
  RECORD_NOT_FOUND: 'الطلب غير موجود. حدّثي الصفحة.',
  CANNOT_WITHDRAW: 'لا يمكن الانسحاب من هذا الطلب في حالته الحالية.',
}

export default function WithdrawApplicationButton({ applicationId }: { applicationId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)

  async function withdraw() {
    if (busy) return
    if (!window.confirm('هل تريدين الانسحاب من هذا الطلب؟ يمكنك التقديم مجددًا لاحقًا إذا تغيّر قرارك.')) return
    setBusy(true)
    setMessage('')
    setFailed(false)
    try {
      const { error } = await createClient().rpc('withdraw_trip_application', { p_id: applicationId })
      if (error) {
        setMessage(messages[error.message] ?? 'تعذر الانسحاب من الطلب. تحققي من الاتصال ثم حاولي مجددًا.')
        setFailed(true)
        return
      }
      router.refresh()
    } catch {
      setMessage('تعذر الانسحاب من الطلب. تحققي من الاتصال ثم حاولي مجددًا.')
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void withdraw()}
        className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#617A55]/30 px-4 text-sm font-semibold text-[#617A55] transition hover:bg-[#D6E2B6]/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? 'جارٍ الانسحاب...' : 'انسحاب من الطلب'}
      </button>
      {message && (
        <p role={failed ? 'alert' : 'status'} className="mt-2 text-sm text-[#617A55]">
          {message}
        </p>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export const requestStatuses = [
  { value: 'pending', label: 'جديد' },
  { value: 'contacted', label: 'تم التواصل' },
  { value: 'scheduled', label: 'تم تحديد موعد' },
  { value: 'closed', label: 'مغلق' },
] as const

export default function RequestStatusSelect({ id, status }: { id: string; status: string }) {
  const router = useRouter()
  const [currentStatus, setCurrentStatus] = useState(status)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)

  async function save(next: string) {
    if (busy || !requestStatuses.some((option) => option.value === next)) return
    setBusy(true)
    setMessage('')
    setFailed(false)
    try {
      const { data, error } = await createClient()
        .from('session_requests')
        .update({ status: next })
        .eq('id', id)
        .select('id, status')
        .single()
      if (error || !data) throw new Error('Update rejected')
      setCurrentStatus(data.status)
      setMessage('تم حفظ حالة الطلب.')
      router.refresh()
    } catch {
      setFailed(true)
      setMessage('تعذر حفظ الحالة. تحققي من الاتصال والصلاحيات ثم حاولي مجددًا.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-w-0 sm:max-w-xs">
      <label htmlFor={`request-status-${id}`} className="mb-2 block text-xs font-semibold text-[#617A55]">حالة الطلب</label>
      <select
        id={`request-status-${id}`}
        value={currentStatus}
        disabled={busy}
        onChange={(event) => void save(event.target.value)}
        className="min-h-11 w-full rounded-lg border border-[#617A55]/25 bg-[#F7F6F0] px-3 text-sm text-[#617A55] outline-none focus:border-[#617A55] disabled:opacity-60"
      >
        {!requestStatuses.some((option) => option.value === currentStatus) && <option value={currentStatus}>حالة غير معروفة</option>}
        {requestStatuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {busy && <p role="status" className="mt-2 text-sm text-[#617A55]">جارٍ الحفظ...</p>}
      {message && <p role={failed ? 'alert' : 'status'} className="mt-2 text-sm leading-6 text-[#617A55]">{message}</p>}
    </div>
  )
}

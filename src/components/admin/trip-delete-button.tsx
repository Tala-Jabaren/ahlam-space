'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Separate from AdminDeleteButton on purpose: that component always calls
// admin_delete_record, and trips deliberately use their own
// trip and photo deletion functions rather than adding cases to that shared
// RPC. Same confirm/busy/error UX, different RPC name.
const messages: Record<string, string> = {
  FORBIDDEN: 'ليست لديك صلاحية الحذف.',
  RECORD_NOT_FOUND: 'السجل غير موجود. حدّثي الصفحة.',
}

export default function TripDeleteButton({
  rpc,
  id,
  label,
}: {
  rpc: 'admin_delete_trip' | 'admin_delete_trip_gallery_photo' | 'admin_delete_trip_photo'
  id: string
  label: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)

  async function remove() {
    if (busy || deleted) return
    if (!window.confirm(`حذف «${label}» نهائيًا؟ لا يمكن التراجع عن الحذف.`)) return
    setBusy(true)
    setMessage('')
    setFailed(false)
    try {
      const { data, error } = await createClient().rpc(rpc, { p_id: id })
      if (error) {
        const known = Object.keys(messages).find(code => error.message.includes(code))
        setMessage(known ? messages[known] : error.code === '42501' ? messages.FORBIDDEN : 'تعذر الحذف. تحققي من الاتصال والصلاحيات ثم حاولي مجددًا.')
        setFailed(true)
        return
      }
      if (data !== id) throw new Error('Deletion not confirmed')
      setDeleted(true)
      setMessage('تم الحذف.')
      router.refresh()
    } catch {
      setFailed(true)
      setMessage('تعذر الحذف. تحققي من الاتصال والصلاحيات ثم حاولي مجددًا.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="min-w-0 max-w-sm">
    <button
      type="button"
      disabled={busy || deleted}
      onClick={() => void remove()}
      aria-label={`حذف ${label} نهائيًا`}
      title="حذف نهائي"
      className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-lg border border-[#617A55]/25 text-[#617A55] transition hover:bg-[#D6E2B6]/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55] disabled:cursor-not-allowed disabled:opacity-40"
    ><Trash2 size={18} aria-hidden="true" /></button>
    {message && <p role={failed ? 'alert' : 'status'} className="mt-2 break-words text-sm leading-6 text-[#617A55]">{message}</p>}
  </div>
}

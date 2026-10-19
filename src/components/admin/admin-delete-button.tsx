'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export type DeleteKind = 'product' | 'variant' | 'request' | 'class' | 'session' | 'course' | 'booking' | 'course_purchase' | 'order'

const messages: Record<string, string> = {
  FORBIDDEN: 'ليست لديك صلاحية الحذف.',
  RECORD_NOT_FOUND: 'السجل غير موجود. حدّثي الصفحة.',
  RECORD_IN_USE: 'لا يمكن حذف السجل لأنه مرتبط بسجلات أخرى. يمكنك إخفاؤه أو إلغاؤه بدلًا من الحذف.',
  PRODUCT_HAS_ORDERS: 'هذا المنتج مرتبط بطلبات سابقة ولا يمكن حذفه. يمكنك إخفاؤه من المتجر.',
  PROTECTED_FINANCIAL_RECORD: 'هذا السجل مدفوع أو مرتبط بمدفوعات؛ لا يمكن حذفه حفاظًا على سجل الدفع.',
  CANCEL_ORDER_FIRST: 'ألغِي الطلب وأعيدي مخزونه أولًا باستخدام زر «إلغاء وإعادة المخزون»، ثم حاولي الحذف.',
  CANCEL_BOOKING_FIRST: 'لا يمكن حذف حجز قائم. يجب أن يكون الحجز ملغى وغير مدفوع أولًا.',
}

export default function AdminDeleteButton({ kind, id, label }: { kind: DeleteKind; id: string; label: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)

  async function remove() {
    if (busy || deleted) return
    if (!window.confirm(`حذف «${label}» نهائيًا؟ لا يمكن التراجع عن الحذف. السجلات المدفوعة أو المرتبطة بسجلات أخرى محمية من الحذف.`)) return
    setBusy(true)
    setMessage('')
    setFailed(false)
    try {
      const { data, error } = await createClient().rpc('admin_delete_record', { p_kind: kind, p_id: id })
      if (error) {
        const known = Object.keys(messages).find(code => error.message.includes(code))
        setMessage(known ? messages[known] : error.code === '23503' ? messages.RECORD_IN_USE : error.code === '42501' ? messages.FORBIDDEN : error.code === 'PGRST202' || error.code === '42883' ? 'الحذف غير مفعّل بعد. يلزم مراجعة وتطبيق ملف admin-delete-record.sql في Supabase.' : 'تعذر الحذف. تحققي من الاتصال والصلاحيات ثم حاولي مجددًا.')
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

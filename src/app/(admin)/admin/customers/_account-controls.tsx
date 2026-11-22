'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { changeCustomerAccount } from './_account-actions'

const button = 'min-h-11 rounded-lg border px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50'

export default function CustomerAccountControls({ userId, name, disabled, backHref }: {
  userId: string
  name: string
  disabled: boolean
  backHref?: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null)

  async function handleChange(change: 'disable' | 'enable' | 'delete') {
    if (pending) return
    const confirmation = change === 'delete'
      ? `حذف حساب ${name} نهائيًا؟ ما بتقدري ترجعي الحساب بعد حذفه. سجلات الطلبات والحجوزات رح تضل محفوظة.`
      : change === 'disable' ? `تعطيل حساب ${name}؟ رح يتوقف دخوله للموقع لحد ما تعيدي تفعيله.` : null
    if (confirmation && !window.confirm(confirmation)) return

    setPending(true)
    setFeedback(null)
    try {
      const result = await changeCustomerAccount(userId, change)
      if (!result.ok) {
        setFeedback({ error: true, text: result.message })
        return
      }
      if (change === 'delete' && backHref) {
        router.replace(backHref)
      } else {
        const messages = { disable: 'تم تعطيل الحساب.', enable: 'تم تفعيل الحساب.', delete: 'تم حذف الحساب.' }
        setFeedback({ error: false, text: messages[change] })
        router.refresh()
      }
    } catch {
      setFeedback({ error: true, text: 'تعذّر تعديل الحساب. حدّثي القائمة وحاولي مرة أخرى.' })
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid justify-items-start gap-2">
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${disabled ? 'bg-[#EAF1F8] text-[#3F5F7A]' : 'bg-[#D6E2B6]/60 text-[#465d3d]'}`}>
        {disabled ? 'حساب معطّل' : 'حساب مفعّل'}
      </span>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => handleChange(disabled ? 'enable' : 'disable')} className={`${button} border-[#617A55]/30 text-[#465d3d] hover:bg-[#D6E2B6]/35`}>
          {disabled ? 'إعادة التفعيل' : 'تعطيل الحساب'}
        </button>
        <button type="button" disabled={pending} onClick={() => handleChange('delete')} className={`${button} border-red-200 text-red-800 hover:bg-red-50`}>
          حذف الحساب
        </button>
      </div>
      {pending && <p role="status" className="text-sm">جارٍ التنفيذ…</p>}
      {feedback && <p role={feedback.error ? 'alert' : 'status'} className={`text-sm ${feedback.error ? 'text-red-800' : 'text-[#465d3d]'}`}>{feedback.text}</p>}
    </div>
  )
}

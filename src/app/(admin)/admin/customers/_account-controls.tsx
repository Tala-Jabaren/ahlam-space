'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Power, PowerOff, Trash2 } from 'lucide-react'
import { changeCustomerAccount } from './_account-actions'

const button = 'inline-flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-[11px] font-medium leading-tight focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50'

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
    <div className="grid justify-items-start gap-1">
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${disabled ? 'bg-[#EAF1F8] text-[#3F5F7A]' : 'bg-[#D6E2B6]/60 text-[#465d3d]'}`}>
        {disabled ? 'حساب معطّل' : 'حساب مفعّل'}
      </span>
      <div className="flex gap-1">
        <button
          type="button"
          disabled={pending}
          aria-label={disabled ? 'إعادة التفعيل' : 'تعطيل الحساب'}
          onClick={() => handleChange(disabled ? 'enable' : 'disable')}
          className={`${button} text-[#465d3d] hover:bg-[#D6E2B6]/40`}
        >
          <span className="grid size-6 place-items-center rounded-md bg-[#D6E2B6]/60">
            {disabled ? <Power size={15} aria-hidden="true" /> : <PowerOff size={15} aria-hidden="true" />}
          </span>
          <span>{disabled ? 'تفعيل' : 'تعطيل'}</span>
        </button>
        <button
          type="button"
          disabled={pending}
          aria-label="حذف الحساب"
          onClick={() => handleChange('delete')}
          className={`${button} text-red-800 hover:bg-red-50`}
        >
          <span className="grid size-6 place-items-center rounded-md bg-red-50">
            <Trash2 size={15} aria-hidden="true" />
          </span>
          <span>حذف</span>
        </button>
      </div>
      {pending && <p role="status" className="text-sm">جارٍ التنفيذ…</p>}
      {feedback && <p role={feedback.error ? 'alert' : 'status'} className={`text-sm ${feedback.error ? 'text-red-800' : 'text-[#465d3d]'}`}>{feedback.text}</p>}
    </div>
  )
}

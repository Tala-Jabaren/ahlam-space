'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const fieldStyle = 'mt-2 w-full min-w-0 rounded-lg border border-[#617A55]/25 bg-[#F7F6F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#617A55]'
const buttonStyle = 'inline-flex items-center justify-center gap-2 rounded-lg bg-[#617A55] px-4 py-2 text-sm text-white disabled:opacity-50'

export default function CreatePackageForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') || '').trim()
    const description = String(form.get('description') || '').trim() || null
    const sessionsCount = Number(form.get('sessions_count'))
    const price = Number(form.get('price'))
    const validityRaw = String(form.get('validity_days') || '').trim()
    const validityDays = validityRaw ? Number(validityRaw) : null
    const sortOrder = Number(form.get('sort_order') || 0)

    if (
      !name ||
      !Number.isInteger(sessionsCount) || sessionsCount <= 0 ||
      !Number.isFinite(price) || price < 0 ||
      (validityDays !== null && (!Number.isInteger(validityDays) || validityDays <= 0)) ||
      !Number.isInteger(sortOrder)
    ) {
      setFailed(true)
      setMessage('تحققي من الاسم وعدد الحصص والسعر ومدة الصلاحية.')
      return
    }

    setBusy(true)
    setMessage('')
    try {
      const { error } = await createClient()
        .from('class_packages')
        .insert({
          name,
          description,
          sessions_count: sessionsCount,
          price,
          validity_days: validityDays,
          sort_order: sortOrder,
          is_active: true,
        })
        .select('id')
        .single()
      if (error) throw error

      setFailed(false)
      setMessage('تم إنشاء الباقة.')
      setOpen(false)
      router.refresh()
    } catch {
      setFailed(true)
      setMessage('تعذر إنشاء الباقة. تحققي من الاتصال وتطبيق سياسات الإدارة.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label="إنشاء باقة جديدة" className="py-6">
      {!open ? (
        <button onClick={() => { setOpen(true); setMessage('') }} className={buttonStyle}>
          + أضيفي باقة جديدة
        </button>
      ) : (
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm sm:col-span-2 lg:col-span-3">
            اسم الباقة<input required name="name" maxLength={200} className={fieldStyle} />
          </label>
          <label className="text-sm sm:col-span-2 lg:col-span-3">
            الوصف (اختياري)<textarea name="description" rows={2} className={fieldStyle} />
          </label>
          <label className="text-sm">
            عدد الحصص<input required type="number" name="sessions_count" min="1" step="1" className={fieldStyle} />
          </label>
          <label className="text-sm">
            السعر (₪)<input required type="number" name="price" min="0" step="0.01" className={fieldStyle} />
          </label>
          <label className="text-sm">
            مدة الصلاحية بالأيام (اختياري)<input type="number" name="validity_days" min="1" step="1" className={fieldStyle} />
          </label>
          <label className="text-sm">
            ترتيب العرض<input type="number" name="sort_order" defaultValue={0} step="1" className={fieldStyle} />
          </label>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
            <button disabled={busy} className={buttonStyle}>{busy ? 'جارٍ الحفظ…' : 'حفظ الباقة'}</button>
            <button type="button" disabled={busy} onClick={() => setOpen(false)} className="rounded-lg border border-[#617A55]/25 px-4 py-2 text-sm">إلغاء</button>
          </div>
        </form>
      )}
      {message && (
        <p role={failed ? 'alert' : 'status'} className={`mt-3 rounded-lg p-3 text-sm ${failed ? 'bg-[#C7D6E8]/50' : 'bg-[#D6E2B6]/50'}`}>
          {message}
        </p>
      )}
    </section>
  )
}

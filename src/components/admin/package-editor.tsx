'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/types/database'

const fieldStyle = 'mt-2 w-full min-w-0 rounded-lg border border-[#617A55]/25 bg-[#F7F6F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#617A55]'
const buttonStyle = 'inline-flex items-center justify-center gap-2 rounded-lg bg-[#617A55] px-4 py-2 text-sm text-white disabled:opacity-50'

export default function PackageEditor({ record }: { record: Tables<'class_packages'> }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') || '').trim()
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
        .update({
          name,
          description: String(form.get('description') || '').trim() || null,
          sessions_count: sessionsCount,
          price,
          validity_days: validityDays,
          sort_order: sortOrder,
          is_active: form.get('active') === 'on',
        })
        .eq('id', record.id)
        .select('id')
        .single()
      if (error) throw error

      setFailed(false)
      setMessage('تم حفظ التغييرات.')
      setEditing(false)
      router.refresh()
    } catch {
      setFailed(true)
      setMessage('تعذر الحفظ. تحققي من الاتصال وتطبيق سياسات الإدارة.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {!editing ? (
        <button type="button" className={buttonStyle} onClick={() => { setEditing(true); setMessage('') }}>تعديل</button>
      ) : (
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            اسم الباقة<input name="name" required maxLength={200} defaultValue={record.name} className={fieldStyle} />
          </label>
          <label className="text-sm sm:col-span-2">
            الوصف<textarea name="description" rows={2} defaultValue={record.description || ''} className={fieldStyle} />
          </label>
          <label className="text-sm">
            عدد الحصص<input required type="number" name="sessions_count" min="1" step="1" defaultValue={record.sessions_count} className={fieldStyle} />
          </label>
          <label className="text-sm">
            السعر (₪)<input required type="number" name="price" min="0" step="0.01" defaultValue={record.price} className={fieldStyle} />
          </label>
          <label className="text-sm">
            مدة الصلاحية بالأيام (اختياري)<input type="number" name="validity_days" min="1" step="1" defaultValue={record.validity_days ?? ''} className={fieldStyle} />
          </label>
          <label className="text-sm">
            ترتيب العرض<input type="number" name="sort_order" step="1" defaultValue={record.sort_order} className={fieldStyle} />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="active" defaultChecked={record.is_active} className="size-4 accent-[#617A55]" />
            نشطة (مرئية للزوار)
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button disabled={busy} className={buttonStyle}>{busy ? 'جارٍ الحفظ…' : 'حفظ'}</button>
            <button type="button" disabled={busy} onClick={() => setEditing(false)} className="inline-flex items-center gap-2 rounded-lg border border-[#617A55]/25 px-4 py-2 text-sm">إلغاء</button>
          </div>
        </form>
      )}
      {message && (
        <p role={failed ? 'alert' : 'status'} className={`mt-3 rounded-lg p-3 text-sm ${failed ? 'bg-[#C7D6E8]/50' : 'bg-[#D6E2B6]/50'}`}>
          {message}
        </p>
      )}
    </div>
  )
}

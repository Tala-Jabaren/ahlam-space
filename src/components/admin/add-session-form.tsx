'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { endTime } from './session-controls'
import type { ClassRecord } from './catalog-editor'

const fieldStyle = 'mt-2 w-full min-w-0 rounded-lg border border-[#617A55]/25 bg-[#F7F6F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#617A55]'
const buttonStyle = 'inline-flex items-center justify-center gap-2 rounded-lg bg-[#617A55] px-4 py-2 text-sm text-white disabled:opacity-50'

export type SessionClass = Pick<ClassRecord, 'id' | 'name' | 'duration_minutes'>

export default function AddSessionForm({
  classes, initialClassId, today, fixedDate, initiallyOpen = false, returnHref, onCancel,
}: {
  classes: SessionClass[]
  initialClassId?: string
  today: string
  fixedDate?: string
  initiallyOpen?: boolean
  returnHref?: string
  onCancel?: () => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(initiallyOpen)
  const [classId, setClassId] = useState(initialClassId ?? classes[0]?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  const [start, setStart] = useState('')
  const selectedClass = classes.find((item) => item.id === classId)
  const end = selectedClass ? endTime(start, selectedClass.duration_minutes) : null

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const capacity = Number(form.get('capacity'))
    const date = fixedDate ?? String(form.get('date') || '')
    if (!selectedClass || !end || !Number.isInteger(capacity) || capacity < 1 || date < today) {
      setFailed(true)
      setMessage('تحققي من التاريخ والسعة. يجب أن تنتهي الحصة في اليوم نفسه.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const { error } = await createClient()
        .from('class_sessions')
        .insert({
          class_id: selectedClass.id,
          session_date: date,
          start_time: start,
          end_time: end,
          capacity,
          booked_count: 0,
          status: 'scheduled',
          location: String(form.get('location') || '').trim() || null,
        })
        .select('id')
        .single()
      if (error) throw error
      setFailed(false)
      setMessage('تم إضافة الموعد.')
      setOpen(false)
      setStart('')
      if (returnHref) router.replace(returnHref, { scroll: false })
      router.refresh()
    } catch {
      setFailed(true)
      setMessage('تعذر إضافة الموعد. تحققي من الاتصال وصلاحيات الإدارة.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3">
      {!open ? (
        <button
          type="button"
          onClick={() => { setOpen(true); setMessage('') }}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#617A55]/30 px-4 text-sm font-semibold text-[#617A55] transition hover:bg-[#D6E2B6]/40"
        >
          + أضيفي موعدًا
        </button>
      ) : (
        <form onSubmit={submit} className="mt-2 grid gap-3 sm:grid-cols-2">
          {fixedDate && (
            <label className="text-sm sm:col-span-2">
              الحصة
              <select required value={classId} onChange={(event) => setClassId(event.target.value)} className={fieldStyle}>
                {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          )}
          <label className="text-sm">التاريخ<input required type="date" name="date" min={today} defaultValue={fixedDate} readOnly={Boolean(fixedDate)} className={fieldStyle} /></label>
          <label className="text-sm">وقت البداية<input required type="time" value={start} onChange={e => setStart(e.target.value)} className={fieldStyle} /></label>
          <label className="text-sm">السعة<input required type="number" name="capacity" min="1" max="2147483647" step="1" className={fieldStyle} /></label>
          <label className="text-sm">المكان (اختياري)<input name="location" maxLength={500} className={fieldStyle} /></label>
          <p className="self-center text-sm text-[#617A55] sm:col-span-2">وقت النهاية: <bdi>{end || '—'}</bdi></p>
          <div className="flex gap-2 sm:col-span-2">
            <button disabled={busy} className={buttonStyle}>{busy ? 'جارٍ الحفظ…' : 'حفظ الموعد'}</button>
            <button type="button" disabled={busy} onClick={() => { setOpen(false); onCancel?.() }} className="rounded-lg border border-[#617A55]/25 px-4 py-2 text-sm">إلغاء</button>
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

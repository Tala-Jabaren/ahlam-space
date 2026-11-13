'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { TripRow, TripStatus } from '@/lib/trips'
import { tripStatusLabels } from '@/lib/trips'

const inputStyle = 'mt-2 w-full min-w-0 rounded-lg border border-[#617A55]/25 bg-[#F7F6F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#617A55]'
const buttonStyle = 'inline-flex items-center justify-center gap-2 rounded-lg bg-[#617A55] px-4 py-2 text-sm text-white disabled:opacity-50'

async function uploadCover(tripId: string, file: File): Promise<string> {
  const body = new FormData()
  body.append('trip_id', tripId)
  body.append('image', file)
  const response = await fetch('/admin/trips/upload-photo', { method: 'POST', body })
  const json = await response.json().catch(() => null)
  if (!response.ok || !json?.url) throw new Error('COVER_UPLOAD')
  return json.url as string
}

export default function TripEditor({ record }: { record?: TripRow }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const title = String(form.get('title') || '').trim()
    const description = String(form.get('description') || '').trim()
    const location = String(form.get('location') || '').trim()
    const startsOn = String(form.get('starts_on') || '')
    const endsOn = String(form.get('ends_on') || '')
    const deadline = String(form.get('application_deadline') || '').trim() || null
    const capacityRaw = String(form.get('capacity') || '').trim()
    const status = String(form.get('status') || 'draft') as TripStatus
    const meetingTimeRaw = String(form.get('meeting_time') || '').trim()
    // <input type="time"> gives "HH:MM" - the time column wants "HH:MM:SS".
    const meetingTime = meetingTimeRaw ? `${meetingTimeRaw}:00` : null
    const meetingPoint = String(form.get('meeting_point') || '').trim() || null

    if (!title || !description || !location) {
      setFailed(true)
      setMessage('أدخلي العنوان والوصف والموقع.')
      return
    }
    if (!startsOn || !endsOn || endsOn < startsOn) {
      setFailed(true)
      setMessage('تحققي من تاريخ البداية والنهاية - يجب أن ينتهي المشوار في نفس يوم البداية أو بعده.')
      return
    }
    let capacity: number | null = null
    if (capacityRaw) {
      capacity = Number(capacityRaw)
      if (!Number.isSafeInteger(capacity) || capacity < 1) {
        setFailed(true)
        setMessage('أدخلي سعة صحيحة (عدد صحيح موجب) أو اتركي الحقل فارغًا.')
        return
      }
    }

    setBusy(true)
    setMessage('')
    try {
      const tripId = record?.id ?? crypto.randomUUID()
      let coverImageUrl = record?.cover_image_url ?? null
      const coverFile = form.get('cover_image')
      if (coverFile instanceof File && coverFile.size > 0) {
        coverImageUrl = await uploadCover(tripId, coverFile)
      }

      const values = {
        title,
        description,
        location,
        starts_on: startsOn,
        ends_on: endsOn,
        application_deadline: deadline,
        capacity,
        cover_image_url: coverImageUrl,
        status,
        meeting_time: meetingTime,
        meeting_point: meetingPoint,
      }

      const supabase = createClient()
      const result = record
        ? await supabase.from('trips').update(values).eq('id', record.id).select('id').single()
        : await supabase.from('trips').insert({ id: tripId, ...values }).select('id').single()
      if (result.error) throw result.error

      setFailed(false)
      setMessage(record ? 'تم حفظ التغييرات.' : 'تم إنشاء المشوار.')
      setEditing(false)
      router.refresh()
    } catch (error) {
      setFailed(true)
      const code = error instanceof Error ? error.message : ''
      setMessage(
        code === 'COVER_UPLOAD' ? 'تعذر رفع صورة الغلاف. تحققي من الاتصال ونوع الصورة (JPG أو PNG أو WebP) ثم حاولي مجددًا.'
        : 'تعذر الحفظ. تحققي من الاتصال وتطبيق سياسات الإدارة.'
      )
    } finally {
      setBusy(false)
    }
  }

  return <div>
    {!editing ? (
      <button type="button" className={buttonStyle} onClick={() => { setEditing(true); setMessage('') }}>
        {record ? 'تعديل' : 'مشوار جديد'}
      </button>
    ) : (
      <form onSubmit={save} className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">العنوان<input name="title" required maxLength={200} defaultValue={record?.title} className={inputStyle} /></label>
        <label className="text-sm sm:col-span-2">الوصف<textarea name="description" required rows={4} defaultValue={record?.description} className={inputStyle} /></label>
        <label className="text-sm sm:col-span-2">الموقع<input name="location" required maxLength={200} defaultValue={record?.location} className={inputStyle} /></label>
        <label className="text-sm">تاريخ البداية<input name="starts_on" type="date" required defaultValue={record?.starts_on} className={inputStyle} /></label>
        <label className="text-sm">تاريخ النهاية<input name="ends_on" type="date" required defaultValue={record?.ends_on} className={inputStyle} /></label>
        <label className="text-sm">آخر موعد للتسجيل (اختياري)<input name="application_deadline" type="date" defaultValue={record?.application_deadline ?? ''} className={inputStyle} /></label>
        <label className="text-sm">السعة (اختياري)<input name="capacity" type="number" min="1" step="1" defaultValue={record?.capacity ?? ''} className={inputStyle} /></label>
        <label className="text-sm">
          ساعة التجمع (اختياري)
          <input
            name="meeting_time"
            type="time"
            defaultValue={record?.meeting_time?.slice(0, 5) ?? ''}
            className={inputStyle}
          />
          <span className="mt-1 block text-xs text-[#617A55]/70">
            إذا تُركت فارغة، لن يُرسَل تذكير تلقائي للمقبولات بهذا المشوار.
          </span>
        </label>
        <label className="text-sm">مكان التجمع (اختياري)<input name="meeting_point" maxLength={300} defaultValue={record?.meeting_point ?? ''} className={inputStyle} /></label>
        <label className="text-sm">الحالة<select name="status" required defaultValue={record?.status ?? 'draft'} className={inputStyle}>
          {(Object.keys(tripStatusLabels) as TripStatus[]).map((value) => <option key={value} value={value}>{tripStatusLabels[value]}</option>)}
        </select></label>
        <label className="text-sm">
          صورة الغلاف
          {record?.cover_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={record.cover_image_url} alt="" className="mt-2 h-24 w-24 rounded-lg object-cover" />
          )}
          <input name="cover_image" type="file" accept="image/png,image/jpeg,image/webp" className={inputStyle} />
          <span className="mt-1 block text-xs text-[#617A55]/70">JPG أو PNG أو WebP، حتى 5 ميغابايت. اتركي الحقل فارغًا للإبقاء على الصورة الحالية.</span>
        </label>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button disabled={busy} className={buttonStyle}>{busy ? 'جارٍ الحفظ…' : 'حفظ'}</button>
          <button type="button" disabled={busy} onClick={() => setEditing(false)} className="inline-flex items-center gap-2 rounded-lg border border-[#617A55]/25 px-4 py-2 text-sm">إلغاء</button>
        </div>
      </form>
    )}
    {message && <p role={failed ? 'alert' : 'status'} className={`mt-3 rounded-lg p-3 text-sm ${failed ? 'bg-[#C7D6E8]/50' : 'bg-[#D6E2B6]/50'}`}>{message}</p>}
  </div>
}

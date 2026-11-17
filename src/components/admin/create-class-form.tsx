'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UploadError, publicUrlFor, uploadFileDirect } from '@/lib/admin-upload'
import { endTime } from './session-controls'

const fieldStyle = 'mt-2 w-full min-w-0 rounded-lg border border-[#617A55]/25 bg-[#F7F6F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#617A55]'
const buttonStyle = 'inline-flex items-center justify-center gap-2 rounded-lg bg-[#617A55] px-4 py-2 text-sm text-white disabled:opacity-50'

// Creates a brand-new class and its first session together in one step -
// there is no predefined list of class types (yoga/fitness/dance/...) to
// pick from anymore, Ahlam just types the title herself. A recurring class
// repeats on the same weekday/time every week afterward via the
// generate_weekly_class_sessions() cron job reading classes.is_recurring;
// a non-recurring one is just this single date.
export default function CreateClassForm({ today }: { today: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  const [start, setStart] = useState('')
  const [duration, setDuration] = useState('')
  const [recurring, setRecurring] = useState(false)
  const end = duration ? endTime(start, Number(duration)) : null

  function reset() {
    setStart(''); setDuration(''); setRecurring(false)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') || '').trim()
    const description = String(form.get('description') || '').trim() || null
    const price = Number(form.get('price'))
    const durationMinutes = Number(form.get('duration'))
    const capacity = Number(form.get('capacity'))
    const location = String(form.get('location') || '').trim() || null
    const date = String(form.get('date') || '')
    const computedEnd = endTime(start, durationMinutes)

    if (
      !name ||
      !Number.isFinite(price) || price < 0 ||
      !Number.isInteger(durationMinutes) || durationMinutes <= 0 ||
      !computedEnd ||
      !Number.isInteger(capacity) || capacity < 1 ||
      date < today
    ) {
      setFailed(true)
      setMessage('تحققي من الاسم والسعر ومدة الحصة والتاريخ والسعة. يجب أن تنتهي الحصة في اليوم نفسه.')
      return
    }

    setBusy(true)
    setMessage('')
    try {
      // Generated up front so the image upload (which needs a class_id
      // before the classes row exists yet) and the classes insert itself
      // share the same id - same pattern course/product creation use.
      const classId = crypto.randomUUID()

      let imageUrl: string | null = null
      const imageFile = form.get('image')
      if (imageFile instanceof File && imageFile.size > 0) {
        const uploaded = await uploadFileDirect('/admin/classes/upload-cover', { class_id: classId }, imageFile, 'CLASS_IMAGE_UPLOAD')
        imageUrl = publicUrlFor(uploaded.bucket, uploaded.path)
      }

      // Stored as a real column rather than embedded in the session itself,
      // so the daily cron job can keep generating this class's future weeks
      // on its own - derived from the chosen date the same way the rest of
      // the admin area computes a session's weekday (UTC midnight, matching
      // Postgres's extract(dow from ...)).
      const weekday = recurring ? new Date(`${date}T00:00:00Z`).getUTCDay() : null

      const supabase = createClient()
      const { error: classError } = await supabase
        .from('classes')
        .insert({
          id: classId,
          name,
          description,
          duration_minutes: durationMinutes,
          price,
          is_active: true,
          image_url: imageUrl,
          is_recurring: recurring,
          weekday,
          default_start_time: recurring ? start : null,
        })
        .select('id')
        .single()
      if (classError) throw classError

      const { error: sessionError } = await supabase
        .from('class_sessions')
        .insert({
          class_id: classId,
          session_date: date,
          start_time: start,
          end_time: computedEnd,
          capacity,
          booked_count: 0,
          status: 'scheduled',
          location,
        })
        .select('id')
        .single()
      if (sessionError) throw sessionError

      setFailed(false)
      setMessage(recurring ? 'تم إنشاء الحصة، وستتكرر تلقائيًا كل أسبوع في نفس اليوم والوقت.' : 'تم إنشاء الحصة.')
      setOpen(false)
      reset()
      router.refresh()
    } catch (error) {
      setFailed(true)
      const serverMessage = error instanceof UploadError ? error.serverMessage : undefined
      setMessage(serverMessage ?? 'تعذر إنشاء الحصة. تحققي من الاتصال وتطبيق سياسات الإدارة.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label="إنشاء حصة جديدة" className="py-6">
      {!open ? (
        <button onClick={() => { setOpen(true); setMessage('') }} className={buttonStyle}>
          + أضيفي حصة جديدة
        </button>
      ) : (
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm sm:col-span-2 lg:col-span-3">
            اسم الحصة<input required name="name" maxLength={200} className={fieldStyle} />
          </label>
          <label className="text-sm sm:col-span-2 lg:col-span-3">
            الوصف (اختياري)<textarea name="description" rows={2} className={fieldStyle} />
          </label>
          <label className="text-sm sm:col-span-2 lg:col-span-3">
            صورة الحصة (تظهر في بطاقتها لليوزر)
            <input name="image" type="file" accept="image/png,image/jpeg,image/webp" className={fieldStyle} />
            <span className="mt-1 block text-xs text-[#617A55]/70">JPG أو PNG أو WebP، حتى 5 ميغابايت.</span>
          </label>
          <label className="text-sm">
            السعر (₪)<input required type="number" name="price" min="0" step="0.01" className={fieldStyle} />
          </label>
          <label className="text-sm">
            مدة الحصة (دقيقة)
            <input required type="number" name="duration" min="1" step="1" value={duration} onChange={e => setDuration(e.target.value)} className={fieldStyle} />
          </label>
          <label className="text-sm">
            التاريخ<input required type="date" name="date" min={today} className={fieldStyle} />
          </label>
          <label className="text-sm">
            وقت البداية<input required type="time" value={start} onChange={e => setStart(e.target.value)} className={fieldStyle} />
          </label>
          <label className="text-sm">
            السعة<input required type="number" name="capacity" min="1" max="2147483647" step="1" className={fieldStyle} />
          </label>
          <label className="text-sm">
            المكان (اختياري)<input name="location" maxLength={500} className={fieldStyle} />
          </label>
          <p className="self-center text-sm text-[#617A55]">وقت النهاية: <bdi>{end || '—'}</bdi></p>
          <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-3">
            <input type="checkbox" checked={recurring} onChange={e => setRecurring(e.target.checked)} className="size-4 accent-[#617A55]" />
            حصة دائمة (تتكرر تلقائيًا في نفس اليوم والوقت كل أسبوع) - اتركيها بدون تحديد لحصة لمرة واحدة فقط
          </label>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
            <button disabled={busy} className={buttonStyle}>{busy ? 'جارٍ الحفظ…' : 'حفظ الحصة'}</button>
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

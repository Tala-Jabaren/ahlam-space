'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { meditationsAr } from '@/i18n/meditations'
import { UploadError, publicUrlFor, uploadFileDirect } from '@/lib/admin-upload'

const weekdayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

export type ClassRecord = {
  id: string
  name: string
  description: string | null
  category: string | null
  is_active: boolean | null
  duration_minutes: number
  image_url?: string | null
  is_recurring?: boolean | null
  weekday?: number | null
  default_start_time?: string | null
  // undefined unless PACKAGES_ENABLED - the column may not exist in the
  // database yet, so the parent server component only ever includes it
  // in the query (and this prop gets passed down) once the flag is on.
  package_eligible?: boolean | null
}
export type CourseRecord = { id: string; title: string; description: string | null; price: number; content_type: string; video_url: string | null; article_body: string | null; is_active: boolean | null; audio_path: string | null; duration_minutes: number | null; cover_image_url: string | null }

const inputStyle = 'mt-2 w-full min-w-0 rounded-lg border border-[#617A55]/25 bg-[#F7F6F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#617A55]'
const buttonStyle = 'inline-flex items-center justify-center gap-2 rounded-lg bg-[#617A55] px-4 py-2 text-sm text-white disabled:opacity-50'

function videoPath(value: string) {
  const trimmed = value.trim()
  if (!/^https?:\/\//i.test(trimmed)) {
    if (!trimmed || trimmed.startsWith('/') || trimmed.includes('://') || trimmed.split('/').includes('..')) throw new Error('VIDEO_PATH')
    return trimmed
  }
  const url = new URL(trimmed)
  const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!)
  const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign|authenticated)\/course-videos\/(.+)$/)
  if (url.origin !== project.origin || !match) throw new Error('VIDEO_PATH')
  return decodeURIComponent(match[1])
}

export default function CatalogEditor(props: { kind: 'class'; record: ClassRecord; packagesEnabled?: boolean } | { kind: 'course'; record?: CourseRecord }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  const isCourse = props.kind === 'course'
  const record = props.record
  const [contentType, setContentType] = useState(isCourse ? props.record?.content_type || 'video' : 'video')
  const [recurring, setRecurring] = useState(props.kind === 'class' && props.record.is_recurring === true)

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') || '').trim()
    if (!name) return
    setBusy(true)
    setMessage('')
    try {
      const common = { description: String(form.get('description') || '').trim() || null, is_active: form.get('active') === 'on' }
      const supabase = createClient()
      let result
      if (isCourse) {
        const price = Number(form.get('price'))
        if (!Number.isFinite(price) || price < 0) throw new Error('PRICE')

        // Generated up front so both upload routes (and, on create, the
        // courses insert itself) share the same id - same pattern product
        // creation already uses.
        const courseId = record?.id ?? crypto.randomUUID()

        let coverImageUrl = props.record?.cover_image_url ?? null
        const coverFile = form.get('cover_image')
        if (coverFile instanceof File && coverFile.size > 0) {
          const uploaded = await uploadFileDirect('/admin/courses/upload-cover', { course_id: courseId }, coverFile, 'COVER_UPLOAD')
          coverImageUrl = publicUrlFor(uploaded.bucket, uploaded.path)
        }

        let values: Record<string, unknown>
        if (contentType === 'audio') {
          const duration = Number(form.get('duration'))
          if (!Number.isSafeInteger(duration) || duration <= 0) throw new Error('DURATION')
          let audioPathValue = props.record?.content_type === 'audio' ? (props.record?.audio_path ?? null) : null
          const audioFile = form.get('audio_file')
          if (audioFile instanceof File && audioFile.size > 0) {
            const uploaded = await uploadFileDirect('/admin/courses/upload-audio', { course_id: courseId }, audioFile, 'AUDIO_UPLOAD')
            audioPathValue = uploaded.path
          }
          if (!audioPathValue) throw new Error('AUDIO_REQUIRED')
          values = { ...common, title: name, price, content_type: 'audio', video_url: null, article_body: null, audio_path: audioPathValue, duration_minutes: duration, cover_image_url: coverImageUrl }
        } else {
          const content = String(form.get('content') || '').trim()
          if (!content) throw new Error('CONTENT')
          values = { ...common, title: name, price, content_type: contentType, video_url: contentType === 'video' ? videoPath(content) : null, article_body: contentType === 'article' ? content : null, audio_path: null, duration_minutes: null, cover_image_url: coverImageUrl }
        }

        result = record
          ? await supabase.from('courses').update(values).eq('id', record.id).select('id').single()
          : await supabase.from('courses').insert({ id: courseId, ...values }).select('id').single()
      } else {
        let imageUrl = props.record.image_url ?? null
        const imageFile = form.get('image')
        if (imageFile instanceof File && imageFile.size > 0) {
          const uploaded = await uploadFileDirect('/admin/classes/upload-cover', { class_id: props.record.id }, imageFile, 'CLASS_IMAGE_UPLOAD')
          imageUrl = publicUrlFor(uploaded.bucket, uploaded.path)
        }
        const isRecurring = form.get('recurring') === 'on'
        let weekday: number | null = null
        let defaultStartTime: string | null = null
        if (isRecurring) {
          weekday = Number(form.get('weekday'))
          defaultStartTime = String(form.get('default_start_time') || '')
          if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 || !/^\d{2}:\d{2}$/.test(defaultStartTime)) {
            throw new Error('RECURRENCE')
          }
        }
        result = await supabase
          .from('classes')
          .update({
            ...common,
            name,
            image_url: imageUrl,
            is_recurring: isRecurring,
            weekday,
            default_start_time: defaultStartTime,
            ...(props.packagesEnabled ? { package_eligible: form.get('package_eligible') === 'on' } : {}),
          })
          .eq('id', props.record.id)
          .select('id')
          .single()
      }
      if (result.error) throw result.error
      setFailed(false)
      setMessage(record ? 'تم حفظ التغييرات.' : 'تم إنشاء الكورس.')
      setEditing(false)
      router.refresh()
    } catch (error) {
      setFailed(true)
      const code = error instanceof Error ? error.message : ''
      // The upload routes always return their own specific reason - prefer
      // that over the generic per-code fallback below, which otherwise
      // shows the same vague text for e.g. a missing storage bucket, an
      // unrecognized file format, and an expired admin session alike.
      const serverMessage = error instanceof UploadError ? error.serverMessage : undefined
      setMessage(
        serverMessage ??
        (code === 'AUDIO_REQUIRED' ? 'أضيفي ملف الصوت.'
        : code === 'AUDIO_UPLOAD' ? 'تعذر رفع ملف الصوت. تحققي من الاتصال ونوع الملف (MP3 أو WAV أو OGG أو M4A) ثم حاولي مجددًا.'
        : code === 'COVER_UPLOAD' ? 'تعذر رفع صورة الغلاف. تحققي من الاتصال ونوع الصورة (JPG أو PNG أو WebP) ثم حاولي مجددًا.'
        : code === 'DURATION' ? meditationsAr.adminDurationError
        : code === 'VIDEO_PATH' ? 'استخدمي مسار الفيديو داخل مخزن course-videos أو رابط الملف من نفس المخزن.'
        : code === 'PRICE' ? 'أدخلي سعرًا صحيحًا غير سالب.'
        : code === 'CONTENT' ? 'أضيفي محتوى الكورس.'
        : code === 'CLASS_IMAGE_UPLOAD' ? 'تعذر رفع صورة الحصة. تحققي من الاتصال ونوع الصورة (JPG أو PNG أو WebP) ثم حاولي مجددًا.'
        : code === 'RECURRENCE' ? 'اختاري يوم الأسبوع ووقت البداية للحصة الدائمة.'
        : 'تعذر الحفظ. تحققي من الاتصال وتطبيق سياسات الإدارة.')
      )
    } finally { setBusy(false) }
  }

  return <div>
    {!editing ? <button type="button" className={buttonStyle} onClick={() => { setEditing(true); setMessage(''); setContentType(isCourse ? props.record?.content_type || 'video' : 'video'); setRecurring(props.kind === 'class' && props.record.is_recurring === true) }}>{record ? 'تعديل' : 'إنشاء كورس'}</button> : <form onSubmit={save} className="mt-4 grid gap-4 sm:grid-cols-2">
      <label className="text-sm">{isCourse ? 'عنوان الكورس' : 'اسم الحصة'}<input name="name" required maxLength={200} defaultValue={isCourse ? props.record?.title : props.record.name} className={inputStyle} /></label>
      {isCourse && <label className="text-sm">السعر (₪)<input name="price" type="number" min="0" step="0.01" required defaultValue={props.record?.price ?? 0} className={inputStyle} /></label>}
      <label className="text-sm sm:col-span-2">الوصف<textarea name="description" rows={3} defaultValue={record?.description || ''} className={inputStyle} /></label>
      {!isCourse && <>
        <label className="text-sm sm:col-span-2">
          صورة الحصة (تظهر في بطاقتها لليوزر)
          {props.record.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={props.record.image_url} alt="" className="mt-2 h-24 w-24 rounded-lg object-cover" />
          )}
          <input name="image" type="file" accept="image/png,image/jpeg,image/webp" className={inputStyle} />
          <span className="mt-1 block text-xs text-[#617A55]/70">JPG أو PNG أو WebP، حتى 5 ميغابايت. اتركي الحقل فارغًا للإبقاء على الصورة الحالية.</span>
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="recurring" checked={recurring} onChange={e => setRecurring(e.target.checked)} className="size-4 accent-[#617A55]" />
          حصة دائمة (تتكرر كل أسبوع تلقائيًا)
        </label>
        {recurring && <>
          <label className="text-sm">يوم الأسبوع<select name="weekday" required defaultValue={props.record.weekday ?? ''} className={inputStyle}>
            <option value="" disabled>اختاري اليوم</option>
            {weekdayNames.map((day, index) => <option key={day} value={index}>{day}</option>)}
          </select></label>
          <label className="text-sm">وقت البداية<input name="default_start_time" type="time" required defaultValue={props.record.default_start_time?.slice(0, 5) || ''} className={inputStyle} /></label>
        </>}
        {props.packagesEnabled && (
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="package_eligible" defaultChecked={props.record.package_eligible !== false} className="size-4 accent-[#617A55]" />
            تدخل ضمن الباقات
          </label>
        )}
      </>}
      {isCourse && <>
        <label className="text-sm sm:col-span-2">
          صورة الغلاف (تظهر في بطاقة الكورس)
          {props.record?.cover_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={props.record.cover_image_url} alt="" className="mt-2 h-24 w-24 rounded-lg object-cover" />
          )}
          <input name="cover_image" type="file" accept="image/png,image/jpeg,image/webp" className={inputStyle} />
          <span className="mt-1 block text-xs text-[#617A55]/70">JPG أو PNG أو WebP، حتى 5 ميغابايت. اتركي الحقل فارغًا للإبقاء على الصورة الحالية.</span>
        </label>
        <label className="text-sm">نوع المحتوى<select value={contentType} onChange={e => setContentType(e.target.value)} className={inputStyle}><option value="video">فيديو</option><option value="article">مقال</option><option value="audio">{meditationsAr.adminAudio}</option></select></label>
        {contentType === 'audio' && <label className="text-sm">{meditationsAr.adminDuration}<input name="duration" type="number" min="1" step="1" required defaultValue={props.record?.duration_minutes ?? ''} className={inputStyle} /></label>}
        {contentType === 'audio' ? (
          <label className="text-sm sm:col-span-2">
            ملف الصوت
            <input name="audio_file" type="file" accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,.mp3,.wav,.ogg,.m4a" className={inputStyle} />
            <span className="mt-1 block text-xs text-[#617A55]/70">
              {props.record?.content_type === 'audio' && props.record.audio_path
                ? 'يوجد ملف صوت محفوظ حاليًا. اختاري ملفًا جديدًا لاستبداله، أو اتركي الحقل فارغًا للإبقاء عليه.'
                : 'MP3 أو WAV أو OGG أو M4A، حتى 60 ميغابايت.'}
            </span>
          </label>
        ) : (
          <label className="text-sm sm:col-span-2">{contentType === 'video' ? 'مسار الفيديو أو رابط الملف في course-videos' : 'نص المقال'}<textarea key={contentType} name="content" required rows={contentType === 'article' ? 6 : 2} dir={contentType === 'article' ? 'auto' : 'ltr'} defaultValue={contentType === 'video' ? props.record?.video_url || '' : props.record?.article_body || ''} className={inputStyle} /></label>
        )}
      </>}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={record ? record.is_active === true : true} className="size-4 accent-[#617A55]" />نشطة</label>
      <div className="flex flex-wrap gap-2 sm:col-span-2"><button disabled={busy} className={buttonStyle}>{busy ? 'جارٍ الحفظ…' : 'حفظ'}</button><button type="button" disabled={busy} onClick={() => setEditing(false)} className="inline-flex items-center gap-2 rounded-lg border border-[#617A55]/25 px-4 py-2 text-sm">إلغاء</button></div>
    </form>}
    {message && <p role={failed ? 'alert' : 'status'} className={`mt-3 rounded-lg p-3 text-sm ${failed ? 'bg-[#C7D6E8]/50' : 'bg-[#D6E2B6]/50'}`}>{message}</p>}
  </div>
}

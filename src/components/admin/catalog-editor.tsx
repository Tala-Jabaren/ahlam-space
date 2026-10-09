'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export type ClassRecord = { id: string; name: string; description: string | null; category: string | null; is_active: boolean | null; duration_minutes: number }
export type CourseRecord = { id: string; title: string; description: string | null; price: number; content_type: string; video_url: string | null; article_body: string | null; is_active: boolean | null }

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

export default function CatalogEditor(props: { kind: 'class'; record: ClassRecord } | { kind: 'course'; record?: CourseRecord }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  const isCourse = props.kind === 'course'
  const record = props.record
  const [contentType, setContentType] = useState(isCourse ? props.record?.content_type || 'video' : 'video')

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
        const content = String(form.get('content') || '').trim()
        if (!content) throw new Error('CONTENT')
        const values = { ...common, title: name, price, content_type: contentType, video_url: contentType === 'video' ? videoPath(content) : null, article_body: contentType === 'article' ? content : null }
        result = record ? await supabase.from('courses').update(values).eq('id', record.id).select('id').single() : await supabase.from('courses').insert(values).select('id').single()
      } else {
        result = await supabase.from('classes').update({ ...common, name, category: String(form.get('category')) }).eq('id', props.record.id).select('id').single()
      }
      if (result.error) throw result.error
      setFailed(false)
      setMessage(record ? 'تم حفظ التغييرات.' : 'تم إنشاء الكورس.')
      setEditing(false)
      router.refresh()
    } catch (error) {
      setFailed(true)
      const code = error instanceof Error ? error.message : ''
      setMessage(code === 'VIDEO_PATH' ? 'استخدمي مسار الفيديو داخل مخزن course-videos أو رابط الملف من نفس المخزن.' : code === 'PRICE' ? 'أدخلي سعرًا صحيحًا غير سالب.' : code === 'CONTENT' ? 'أضيفي محتوى الكورس.' : 'تعذر الحفظ. تحققي من الاتصال وتطبيق سياسات الإدارة.')
    } finally { setBusy(false) }
  }

  return <div>
    {!editing ? <button type="button" className={buttonStyle} onClick={() => { setEditing(true); setMessage(''); setContentType(isCourse ? props.record?.content_type || 'video' : 'video') }}>{record ? 'تعديل' : 'إنشاء كورس'}</button> : <form onSubmit={save} className="mt-4 grid gap-4 sm:grid-cols-2">
      <label className="text-sm">{isCourse ? 'عنوان الكورس' : 'اسم الحصة'}<input name="name" required maxLength={200} defaultValue={isCourse ? props.record?.title : props.record.name} className={inputStyle} /></label>
      {isCourse ? <label className="text-sm">السعر (₪)<input name="price" type="number" min="0" step="0.01" required defaultValue={props.record?.price ?? 0} className={inputStyle} /></label> : <label className="text-sm">الفئة<select name="category" required defaultValue={props.record.category || ''} className={inputStyle}><option value="" disabled>اختاري الفئة</option><option value="yoga">يوغا</option><option value="fitness">لياقة</option><option value="dance">رقص</option></select></label>}
      <label className="text-sm sm:col-span-2">الوصف<textarea name="description" rows={3} defaultValue={record?.description || ''} className={inputStyle} /></label>
      {isCourse && <><label className="text-sm">نوع المحتوى<select value={contentType} onChange={e => setContentType(e.target.value)} className={inputStyle}><option value="video">فيديو</option><option value="article">مقال</option></select></label><label className="text-sm sm:col-span-2">{contentType === 'video' ? 'مسار الفيديو أو رابط الملف في course-videos' : 'نص المقال'}<textarea key={contentType} name="content" required rows={contentType === 'video' ? 2 : 6} dir={contentType === 'video' ? 'ltr' : 'rtl'} defaultValue={contentType === 'video' ? props.record?.video_url || '' : props.record?.article_body || ''} className={inputStyle} /></label></>}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={record ? record.is_active === true : true} className="size-4 accent-[#617A55]" />نشطة</label>
      <div className="flex flex-wrap gap-2 sm:col-span-2"><button disabled={busy} className={buttonStyle}>{busy ? 'جارٍ الحفظ…' : 'حفظ'}</button><button type="button" disabled={busy} onClick={() => setEditing(false)} className="inline-flex items-center gap-2 rounded-lg border border-[#617A55]/25 px-4 py-2 text-sm">إلغاء</button></div>
    </form>}
    {message && <p role={failed ? 'alert' : 'status'} className={`mt-3 rounded-lg p-3 text-sm ${failed ? 'bg-[#C7D6E8]/50' : 'bg-[#D6E2B6]/50'}`}>{message}</p>}
  </div>
}

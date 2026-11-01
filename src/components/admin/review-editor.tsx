'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AdminDeleteButton from './admin-delete-button'
import type { ReviewRow } from '@/lib/reviews'

const inputStyle = 'mt-2 w-full min-w-0 rounded-lg border border-[#617A55]/25 bg-[#F7F6F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#617A55]'
const buttonStyle = 'inline-flex items-center justify-center gap-2 rounded-lg bg-[#617A55] px-4 py-2 text-sm text-white disabled:opacity-50'
const ghostButtonStyle = 'inline-flex items-center gap-2 rounded-lg border border-[#617A55]/25 px-4 py-2 text-sm'

async function uploadPhoto(reviewId: string, file: File) {
  const body = new FormData()
  body.append('review_id', reviewId)
  body.append('image', file)
  const response = await fetch('/admin/reviews/upload-photo', { method: 'POST', body })
  const json = await response.json().catch(() => null)
  if (!response.ok || !json) throw new Error('PHOTO_UPLOAD')
  return json as { url?: string }
}

export default function ReviewEditor({ record }: { record?: ReviewRow }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  const [togglingApproved, setTogglingApproved] = useState(false)

  async function toggleApproved() {
    if (!record || togglingApproved) return
    setTogglingApproved(true)
    try {
      const { error } = await createClient().from('reviews').update({ approved: !record.approved }).eq('id', record.id).select('id').single()
      if (error) throw error
      router.refresh()
    } catch {
      setFailed(true)
      setMessage('تعذر تحديث حالة الموافقة. تحققي من الاتصال وصلاحيات الإدارة.')
    } finally {
      setTogglingApproved(false)
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const body = String(form.get('body') || '').trim()
    if (!body) return
    setBusy(true)
    setMessage('')
    try {
      const supabase = createClient()
      // Generated up front so the photo upload (which needs an id) can
      // happen before the row exists yet on create - same pattern course
      // cover uploads already use.
      const reviewId = record?.id ?? crypto.randomUUID()

      let photoUrl = record?.photo_url ?? null
      const removePhoto = form.get('remove_photo') === 'on'
      const photoFile = form.get('photo')
      if (photoFile instanceof File && photoFile.size > 0) {
        const uploaded = await uploadPhoto(reviewId, photoFile)
        photoUrl = uploaded.url ?? photoUrl
      } else if (removePhoto) {
        photoUrl = null
      }

      const values = {
        name: String(form.get('name') || '').trim() || null,
        body,
        lang: String(form.get('lang') || 'ar'),
        sensitive: form.get('sensitive') === 'on',
        photo_url: photoUrl,
      }

      const result = record
        ? await supabase.from('reviews').update(values).eq('id', record.id).select('id').single()
        : await supabase.from('reviews').insert({ id: reviewId, ...values }).select('id').single()
      if (result.error) throw result.error

      setFailed(false)
      setMessage(record ? 'تم حفظ التغييرات.' : 'تم إنشاء المراجعة.')
      setEditing(false)
      router.refresh()
    } catch (error) {
      setFailed(true)
      const code = error instanceof Error ? error.message : ''
      setMessage(
        code === 'PHOTO_UPLOAD'
          ? 'تعذر رفع الصورة. تحققي من الاتصال ونوع الصورة (JPG أو PNG أو WebP) ثم حاولي مجددًا.'
          : 'تعذر الحفظ. تحققي من الاتصال وتطبيق سياسات الإدارة.'
      )
    } finally {
      setBusy(false)
    }
  }

  const excerpt = record ? (record.body.length > 150 ? `${record.body.slice(0, 150)}…` : record.body) : ''

  return (
    <article className="min-w-0 rounded-lg border border-[#617A55]/15 bg-white p-5">
      {!editing ? (
        <>
          {record && (
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p dir={record.lang === 'en' ? 'ltr' : 'rtl'} className="whitespace-pre-wrap break-words text-sm leading-7">
                  {excerpt}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-[#D6E2B6]/60 px-3 py-1 font-semibold text-[#617A55]">
                    {record.name || 'بدون اسم (تُعرض كـ «مشاركة»)'}
                  </span>
                  <span className="rounded-full bg-[#617A55]/10 px-3 py-1 text-[#617A55]">
                    {record.lang === 'en' ? 'إنجليزي' : 'عربي'}
                  </span>
                  {record.sensitive && (
                    <span className="rounded-full bg-[#C7D6E8]/60 px-3 py-1 font-semibold text-[#3a5068]">حساسة</span>
                  )}
                  <span className={`rounded-full px-3 py-1 font-semibold ${record.approved ? 'bg-[#D6E2B6]/70 text-[#3f5233]' : 'bg-[#617A55]/10 text-[#617A55]/80'}`}>
                    {record.approved ? 'موافق عليها - معروضة علنًا' : 'غير موافق عليها'}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-center gap-2">
                {record.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={record.photo_url} alt="" className="size-14 rounded-full border border-[#617A55]/20 object-cover" />
                ) : (
                  <span className="grid size-14 place-items-center rounded-full border border-dashed border-[#617A55]/25 text-xs text-[#617A55]/60">
                    بدون صورة
                  </span>
                )}
                <AdminDeleteButton kind="review" id={record.id} label={record.name || 'مراجعة بدون اسم'} />
              </div>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {record && (
              <button
                type="button"
                onClick={() => void toggleApproved()}
                disabled={togglingApproved}
                className={record.approved ? ghostButtonStyle : buttonStyle}
              >
                {togglingApproved ? 'جارٍ الحفظ…' : record.approved ? 'إلغاء الموافقة' : 'موافقة وعرضها علنًا'}
              </button>
            )}
            <button
              type="button"
              className={record ? ghostButtonStyle : buttonStyle}
              onClick={() => { setEditing(true); setMessage('') }}
            >
              {record ? 'تعديل' : 'مراجعة جديدة'}
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            الاسم (اختياري - بدونه تُعرض كـ «مشاركة»)
            <input name="name" maxLength={100} defaultValue={record?.name || ''} className={inputStyle} />
          </label>
          <label className="text-sm">
            اللغة
            <select name="lang" required defaultValue={record?.lang || 'ar'} className={inputStyle}>
              <option value="ar">عربي</option>
              <option value="en">إنجليزي</option>
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            النص
            <textarea name="body" required rows={6} dir="auto" defaultValue={record?.body || ''} className={inputStyle} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="sensitive" defaultChecked={record?.sensitive ?? false} className="size-4 accent-[#617A55]" />
            محتوى حساس (مثلًا يذكر العلاج النفسي) - يحتاج مراجعة قبل الموافقة
          </label>
          <label className="text-sm sm:col-span-2">
            صورة المشاركة (اختياري)
            {record?.photo_url && (
              <span className="mt-2 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={record.photo_url} alt="" className="size-14 rounded-full border border-[#617A55]/20 object-cover" />
                <span className="flex items-center gap-2 text-xs">
                  <input type="checkbox" name="remove_photo" className="size-4 accent-[#617A55]" />
                  إزالة الصورة الحالية
                </span>
              </span>
            )}
            <input name="photo" type="file" accept="image/png,image/jpeg,image/webp" className={inputStyle} />
            <span className="mt-1 block text-xs text-[#617A55]/70">JPG أو PNG أو WebP، حتى 5 ميغابايت. اتركي الحقل فارغًا للإبقاء على الصورة الحالية.</span>
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button disabled={busy} className={buttonStyle}>{busy ? 'جارٍ الحفظ…' : 'حفظ'}</button>
            <button type="button" disabled={busy} onClick={() => setEditing(false)} className={ghostButtonStyle}>إلغاء</button>
          </div>
        </form>
      )}
      {message && (
        <p role={failed ? 'alert' : 'status'} className={`mt-3 rounded-lg p-3 text-sm ${failed ? 'bg-[#C7D6E8]/50' : 'bg-[#D6E2B6]/50'}`}>
          {message}
        </p>
      )}
    </article>
  )
}

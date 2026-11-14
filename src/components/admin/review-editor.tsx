'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AdminDeleteButton from './admin-delete-button'
import type { ReviewRow } from '@/lib/reviews'

const inputStyle = 'mt-2 w-full min-w-0 rounded-lg border border-[#617A55]/25 bg-[#F7F6F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#617A55]'
const buttonStyle = 'inline-flex items-center justify-center gap-2 rounded-lg bg-[#617A55] px-4 py-2 text-sm text-white disabled:opacity-50'
const ghostButtonStyle = 'inline-flex items-center gap-2 rounded-lg border border-[#617A55]/25 px-4 py-2 text-sm'

// A click-to-upload circle, not a bare file input: the dashed circle
// itself is the drop target (opens the hidden input), shows a live
// preview of whatever's picked (object URL, before the real upload even
// happens), and gets a small "x" badge to clear/remove it. `name="photo"`
// / `name="remove_photo"` keep the exact two FormData keys save() already
// reads - only the control's look changes, not the submit contract.
function PhotoUpload({ initialUrl }: { initialUrl: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState(initialUrl)
  const [removed, setRemoved] = useState(false)

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    },
    []
  )

  function onFileChange() {
    const file = inputRef.current?.files?.[0]
    if (!file) return
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const url = URL.createObjectURL(file)
    objectUrlRef.current = url
    setPreviewUrl(url)
    setRemoved(false)
  }

  function clearPhoto(event: React.MouseEvent) {
    event.stopPropagation()
    if (inputRef.current) inputRef.current.value = ''
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    setPreviewUrl(null)
    setRemoved(true)
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label="اختيار صورة المشاركة"
          className="group relative flex size-24 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[#617A55]/35 bg-[#F7F6F0] text-[#617A55]/60 transition hover:border-[#617A55]/60 hover:bg-[#617A55]/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55]"
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-xs">
              <Camera aria-hidden="true" size={22} />
              إضافة صورة
            </span>
          )}
          {previewUrl && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition group-hover:opacity-100">
              <Camera aria-hidden="true" size={20} className="text-white" />
            </span>
          )}
        </button>
        {previewUrl && (
          <button
            type="button"
            onClick={clearPhoto}
            aria-label="إزالة الصورة"
            className="absolute -top-1 -end-1 grid size-6 place-items-center rounded-full border border-[#617A55]/20 bg-white text-[#617A55] shadow-sm hover:bg-[#F7F6F0]"
          >
            <X aria-hidden="true" size={14} />
          </button>
        )}
      </div>
      <input ref={inputRef} name="photo" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onFileChange} />
      <input type="hidden" name="remove_photo" value={removed ? 'on' : ''} />
      <span className="text-center text-xs text-[#617A55]/70">JPG أو PNG أو WebP، حتى 5 ميغابايت</span>
    </div>
  )
}

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
          <div className="text-sm sm:col-span-2">
            <p className="mb-2">صورة المشاركة (اختياري)</p>
            <PhotoUpload initialUrl={record?.photo_url ?? null} />
          </div>
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

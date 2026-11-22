'use client'

import Image from 'next/image'
import { ImagePlus, Pencil, Plus } from 'lucide-react'
import { useEffect, useRef, useState, useTransition, type ChangeEvent, type FormEvent } from 'react'
import { MAX_PRODUCT_IMAGE_BYTES, PRODUCT_IMAGE_TYPES } from '@/components/admin/product-input'
import { UploadError, uploadFileDirect } from '@/lib/admin-upload'
import { DEFAULT_PRIVATE_SESSION_IMAGE, privateSessionImageSrc } from '@/lib/private-session-images'
import type { PrivateSessionService } from '@/lib/private-session-services'
import { savePrivateSession } from './service-actions'

const field = 'mt-1.5 block w-full min-w-0 rounded-lg border border-[#617A55]/25 bg-[#F7F6F0] px-3 py-2.5 text-[#25311f] focus-visible:outline-2 focus-visible:outline-[#617A55]'
const primary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#617A55] px-5 text-sm font-semibold text-white hover:bg-[#4f6645] disabled:opacity-60'
const secondary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#617A55]/25 px-4 text-sm font-semibold text-[#465d3d] hover:bg-[#D6E2B6]/40 disabled:opacity-60'

export default function ServiceEditor({ services }: { services: PrivateSessionService[] }) {
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const [preview, setPreview] = useState<string | null>(null)
  const uploadedImage = useRef<string | null>(null)

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  function open(id: typeof editing) {
    setNotice('')
    setError('')
    setPreview(null)
    uploadedImage.current = null
    setEditing(id)
  }

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    uploadedImage.current = null
    setError('')
    setPreview(file && file.size <= MAX_PRODUCT_IMAGE_BYTES ? URL.createObjectURL(file) : null)
    if (file && file.size > MAX_PRODUCT_IMAGE_BYTES) {
      event.currentTarget.value = ''
      setError('حجم الصورة يجب ألا يتجاوز 5 ميغابايت.')
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || editing === null) return
    const id = editing === 'new' ? null : editing
    const form = new FormData(event.currentTarget)
    const file = form.get('image_file')
    form.delete('image_file')
    setError('')
    startTransition(async () => {
      try {
        if (file instanceof File && file.size > 0) {
          if (!uploadedImage.current) {
            const { path } = await uploadFileDirect('/admin/requests/upload-cover', {
              upload_id: crypto.randomUUID(),
              size: String(file.size),
            }, file, 'PRIVATE_SESSION_IMAGE_UPLOAD')
            uploadedImage.current = path
          }
          form.set('image', uploadedImage.current)
        }
        const result = await savePrivateSession(id, form)
        if (result.error) {
          setError(result.error)
          return
        }
        open(null)
        setNotice(id === null ? 'تمت إضافة الجلسة.' : 'تم حفظ التعديلات.')
      } catch (error) {
        setError(error instanceof UploadError
          ? error.serverMessage ?? 'تعذّر رفع الصورة. حاولي مرة أخرى.'
          : 'تعذّر حفظ الجلسة. حاولي مرة أخرى.')
      }
    })
  }

  function form(service?: PrivateSessionService) {
    return (
      <form onSubmit={submit} aria-label={service ? 'تعديل الجلسة' : 'إضافة جلسة جديدة'}>
        <fieldset disabled={pending} className="grid min-w-0 gap-4 text-sm text-[#465d3d] sm:grid-cols-2">
          <label>اسم الجلسة بالعربي<input name="title_ar" required maxLength={120} className={field} defaultValue={service?.title_ar} /></label>
          <label>اسم الجلسة بالإنجليزي (اختياري)<input name="title_en" dir="ltr" maxLength={120} className={field} defaultValue={service?.title_en ?? ''} /></label>
          <label>الوصف بالعربي<textarea name="description_ar" required maxLength={3000} rows={4} className={field} defaultValue={service?.description_ar} /></label>
          <label>الوصف بالإنجليزي (اختياري)<textarea name="description_en" dir="ltr" maxLength={3000} rows={4} className={field} defaultValue={service?.description_en ?? ''} /></label>
          <div className="min-w-0">
            <p className="mb-1.5 font-medium">صورة الجلسة</p>
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#617A55]/25 bg-[#F7F6F0] p-3">
              <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-[#D6E2B6]/40">
                <Image src={preview ?? privateSessionImageSrc(service?.image ?? DEFAULT_PRIVATE_SESSION_IMAGE)} alt="معاينة صورة الجلسة" fill unoptimized className="object-cover" />
              </div>
              <div className="min-w-0">
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-[#617A55]/25 bg-white px-4 font-semibold hover:bg-[#D6E2B6]/40 focus-within:outline-2 focus-within:outline-[#617A55]">
                  <ImagePlus size={17} aria-hidden="true" />
                  اختيار صورة من الجهاز
                  <input type="file" name="image_file" accept={PRODUCT_IMAGE_TYPES.join(',')} className="sr-only" onChange={chooseImage} />
                </label>
                <p className="mt-1 text-xs">JPG أو PNG أو WebP، حتى 5 ميغابايت</p>
              </div>
            </div>
          </div>
          <div className="grid min-w-0 gap-2">
            <label>السعر بالشيكل (اختياري)<input name="price" type="number" min="0" max="99999999.99" step="0.01" className={field} defaultValue={service?.price ?? ''} /></label>
            <label className="flex min-h-8 items-center gap-2"><input name="hourly" type="checkbox" defaultChecked={service?.hourly} /> السعر للساعة</label>
          </div>
          <label>المدة بالعربي (اختياري)<input name="duration_ar" maxLength={150} className={field} defaultValue={service?.duration_ar ?? ''} /></label>
          <label>المدة بالإنجليزي (اختياري)<input name="duration_en" dir="ltr" maxLength={150} className={field} defaultValue={service?.duration_en ?? ''} /></label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button type="submit" className={primary}>{pending ? 'جارٍ الحفظ…' : 'حفظ الجلسة'}</button>
            <button type="button" onClick={() => open(null)} className={secondary}>إلغاء</button>
          </div>
        </fieldset>
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      </form>
    )
  }

  return (
    <section className="mt-6" aria-label="إدارة الجلسات">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-[#465d3d]">الجلسات المعروضة بالموقع</h2>
        {editing !== 'new' && <button type="button" disabled={pending} onClick={() => open('new')} className={primary}><Plus size={18} aria-hidden="true" /> إضافة جلسة</button>}
      </div>
      {notice && <p role="status" className="mt-4 rounded-lg bg-[#D6E2B6]/50 px-4 py-3 text-sm text-[#465d3d]">{notice}</p>}
      {editing === 'new' && <div className="mt-4 rounded-xl border border-[#617A55]/15 bg-white p-4 sm:p-6">{form()}</div>}
      {services.length === 0 && editing !== 'new' && <p className="mt-4 text-sm text-[#465d3d]">لا توجد جلسات معروضة.</p>}
      <div className="mt-4 grid gap-3">
        {services.map((service) => (
          <article key={service.id} className="min-w-0 rounded-xl border border-[#617A55]/15 bg-white p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="min-w-0 break-words text-lg font-semibold text-[#465d3d]">{service.title_ar}</h3>
              {editing !== service.id && (
                <button type="button" aria-label={`تعديل ${service.title_ar}`} disabled={pending} onClick={() => open(service.id)} className={secondary}><Pencil size={16} aria-hidden="true" /> تعديل</button>
              )}
            </div>
            {editing === service.id ? <div className="mt-4">{form(service)}</div> : (
              <div className="mt-2 text-sm leading-6 text-[#465d3d]">
                <p className="line-clamp-2 break-words">{service.description_ar}</p>
                {(service.price !== null || service.duration_ar) && (
                  <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-medium">
                    {service.price !== null && <span><bdi>{service.price}</bdi> شيكل{service.hourly ? ' للساعة' : ''}</span>}
                    {service.duration_ar && <span>{service.duration_ar}</span>}
                  </p>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}

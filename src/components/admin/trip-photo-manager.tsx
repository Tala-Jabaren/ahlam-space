'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UploadError, publicUrlFor, uploadFileDirect } from '@/lib/admin-upload'
import TripDeleteButton from './trip-delete-button'
import type { TripGalleryPhoto } from '@/lib/trips'
import { MAX_PRODUCT_IMAGE_BYTES, PRODUCT_IMAGE_TYPES } from './product-input'

const inputStyle = 'mt-2 w-full min-w-0 rounded-lg border border-[#617A55]/25 bg-[#F7F6F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#617A55]'
const buttonStyle = 'inline-flex items-center justify-center gap-2 rounded-lg bg-[#617A55] px-4 py-2 text-sm text-white disabled:opacity-50'

export default function TripPhotoManager({ photos, tripId }: { photos: TripGalleryPhoto[]; tripId?: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  const table = tripId ? 'trip_photos' : 'trip_gallery_photos'

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const target = event.currentTarget
    const form = new FormData(target)
    const files = form.getAll('image').filter((file): file is File => file instanceof File && file.size > 0)
    if (!files.length) {
      setFailed(true)
      setMessage('اختاري صورة.')
      return
    }
    if (files.some(file => file.size > MAX_PRODUCT_IMAGE_BYTES)) {
      setFailed(true)
      setMessage('حجم كل صورة يجب ألا يتجاوز 5 ميغابايت.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const caption = String(form.get('caption') || '').trim() || null
      const nextOrder = photos.length ? Math.max(...photos.map((item) => item.display_order)) + 1 : 0
      const rows = []
      for (const file of files) {
        const fields: Record<string, string> = tripId ? { trip_id: tripId } : { upload_id: crypto.randomUUID() }
        const uploaded = await uploadFileDirect(tripId ? '/admin/trips/upload-photo' : '/admin/trips/upload-gallery-photo', {
          ...fields,
          size: String(file.size),
        }, file, 'PHOTO_UPLOAD')
        rows.push({
          ...(tripId ? { trip_id: tripId, is_trip_attachment: true } : {}),
          photo_url: publicUrlFor(uploaded.bucket, uploaded.path),
          caption,
          display_order: nextOrder + rows.length,
          is_published: Boolean(tripId),
        })
      }
      const { error } = await createClient().from(table).insert(tripId ? rows : rows[0])
      if (error) {
        // The file itself uploaded fine here - this is a separate failure
        // (most likely RLS) saving the gallery row, so it gets its own
        // message rather than being folded into the upload-failed one.
        console.error('Trip photo insert failed after upload:', error.message)
        setFailed(true)
        setMessage('تعذّر حفظ الصور في القائمة. حاولي مجددًا.')
        return
      }

      setFailed(false)
      setMessage(tripId ? 'تمت إضافة الصور للمشوار.' : 'تم رفع الصورة. فعّلي النشر عندما تكونين جاهزة.')
      target.reset()
      router.refresh()
    } catch (err) {
      console.error('Trip photo upload failed:', err)
      setFailed(true)
      setMessage(err instanceof UploadError && err.serverMessage ? err.serverMessage : 'تعذر رفع الصورة. تحققي من الاتصال ثم حاولي مجددًا.')
    } finally {
      setBusy(false)
    }
  }

  async function togglePublished(photo: TripGalleryPhoto) {
    try {
      const { error } = await createClient().from(table).update({ is_published: !photo.is_published }).eq('id', photo.id).select('id').single()
      if (error) throw error
      router.refresh()
    } catch {
      setFailed(true)
      setMessage('تعذر تحديث حالة النشر.')
    }
  }

  async function saveOrder(photo: TripGalleryPhoto, nextOrder: number) {
    if (!Number.isInteger(nextOrder) || nextOrder === photo.display_order) return
    try {
      const { error } = await createClient().from(table).update({ display_order: nextOrder }).eq('id', photo.id).select('id').single()
      if (error) throw error
      router.refresh()
    } catch {
      setFailed(true)
      setMessage('تعذر تحديث الترتيب.')
    }
  }

  return <section className="mt-6 min-w-0 rounded-xl border border-[#617A55]/15 bg-white p-4 sm:p-6">
    <h2 className="font-serif text-2xl text-[#617A55]">{tripId ? 'صور المشوار' : 'معرض صفحة المشاوير'}</h2>

    <form onSubmit={upload} className="mt-4 grid gap-4 sm:grid-cols-2">
      <label className={`text-sm ${tripId ? 'sm:col-span-2' : ''}`}>
        {tripId ? 'اختاري صور المشوار' : 'صورة جديدة'}
        <input name="image" type="file" accept={PRODUCT_IMAGE_TYPES.join(',')} multiple={Boolean(tripId)} required disabled={busy} className={inputStyle} />
      </label>
      {!tripId && <label className="text-sm">وصف الصورة (اختياري)<input name="caption" maxLength={300} className={inputStyle} /></label>}
      <div className="sm:col-span-2"><button disabled={busy} className={buttonStyle}>{busy ? 'جارٍ الرفع…' : tripId ? 'رفع الصور' : 'رفع الصورة'}</button></div>
    </form>
    {message && <p role={failed ? 'alert' : 'status'} className={`mt-3 rounded-lg p-3 text-sm ${failed ? 'bg-[#C7D6E8]/50' : 'bg-[#D6E2B6]/50'}`}>{message}</p>}

    {!photos.length ? (
      <p className="mt-4 text-sm text-[#617A55]/70">لا توجد صور بعد.</p>
    ) : (
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((photo) => (
          <li key={photo.id} className="min-w-0 rounded-lg border border-[#617A55]/15 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.photo_url} alt={photo.caption ?? ''} className="h-40 w-full rounded-lg object-cover" />
            {photo.caption && <p className="mt-2 break-words text-sm">{photo.caption}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={photo.is_published} onChange={() => void togglePublished(photo)} className="size-4 accent-[#617A55]" />
                منشورة
              </label>
              <label className="flex items-center gap-2 text-sm">
                الترتيب
                <input
                  type="number"
                  defaultValue={photo.display_order}
                onBlur={(event) => void saveOrder(photo, event.currentTarget.valueAsNumber)}
                  className="w-16 rounded-lg border border-[#617A55]/25 bg-[#F7F6F0] px-2 py-1 text-sm"
                />
              </label>
              <TripDeleteButton rpc={tripId ? 'admin_delete_trip_photo' : 'admin_delete_trip_gallery_photo'} id={photo.id} label={tripId ? 'صورة المشوار' : 'صورة المعرض'} />
            </div>
          </li>
        ))}
      </ul>
    )}
  </section>

}

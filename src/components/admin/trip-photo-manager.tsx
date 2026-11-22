'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UploadError, publicUrlFor, uploadFileDirect } from '@/lib/admin-upload'
import TripDeleteButton from './trip-delete-button'
import type { TripPhotoRow } from '@/lib/trips'

const inputStyle = 'mt-2 w-full min-w-0 rounded-lg border border-[#617A55]/25 bg-[#F7F6F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#617A55]'
const buttonStyle = 'inline-flex items-center justify-center gap-2 rounded-lg bg-[#617A55] px-4 py-2 text-sm text-white disabled:opacity-50'

export default function TripPhotoManager({ tripId, coverUrl, photos }: { tripId: string; coverUrl: string | null; photos: TripPhotoRow[] | null }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)

  async function saveCover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const target = event.currentTarget
    const file = new FormData(target).get('cover')
    if (busy || !(file instanceof File) || !file.size) return
    setBusy(true)
    setMessage('')
    try {
      const uploaded = await uploadFileDirect('/admin/trips/upload-photo', { trip_id: tripId, size: String(file.size) }, file, 'COVER_UPLOAD')
      const { error } = await createClient().from('trips')
        .update({ cover_image_url: publicUrlFor(uploaded.bucket, uploaded.path) })
        .eq('id', tripId)
        .select('id')
        .single()
      if (error) throw error
      target.reset()
      setFailed(false)
      setMessage('تم حفظ صورة الغلاف.')
      router.refresh()
    } catch (error) {
      setFailed(true)
      setMessage(error instanceof UploadError && error.serverMessage ? error.serverMessage : 'تعذر حفظ صورة الغلاف. حاولي مجددًا.')
    } finally {
      setBusy(false)
    }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !photos) return
    const target = event.currentTarget
    const form = new FormData(target)
    const file = form.get('image')
    if (!(file instanceof File) || file.size === 0) {
      setFailed(true)
      setMessage('اختاري صورة.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      // Relays the upload route's own Arabic error (invalid file type, too
      // large, not an admin, storage failure, etc.) via UploadError instead
      // of a single generic message that was hiding which of those
      // actually happened.
      const uploaded = await uploadFileDirect('/admin/trips/upload-photo', { trip_id: tripId }, file, 'PHOTO_UPLOAD')
      const url = publicUrlFor(uploaded.bucket, uploaded.path)

      const caption = String(form.get('caption') || '').trim() || null
      const nextOrder = photos.length ? Math.max(...photos.map((item) => item.display_order)) + 1 : 0
      const { error } = await createClient().from('trip_photos').insert({
        trip_id: tripId,
        photo_url: url,
        caption,
        display_order: nextOrder,
        is_published: false,
      })
      if (error) {
        // The file itself uploaded fine here - this is a separate failure
        // (most likely RLS) saving the trip_photos row, so it gets its own
        // message rather than being folded into the upload-failed one.
        console.error('trip_photos insert failed after a successful upload:', error.message)
        setFailed(true)
        setMessage('تم رفع الصورة لكن تعذر حفظها في قائمة الصور. حدّثي الصفحة وحاولي مجددًا.')
        return
      }

      setFailed(false)
      setMessage('تم رفع الصورة. فعّلي النشر عندما تكونين جاهزة.')
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

  async function togglePublished(photo: TripPhotoRow) {
    try {
      const { error } = await createClient().from('trip_photos').update({ is_published: !photo.is_published }).eq('id', photo.id)
      if (error) throw error
      router.refresh()
    } catch {
      setFailed(true)
      setMessage('تعذر تحديث حالة النشر.')
    }
  }

  async function saveOrder(photo: TripPhotoRow, nextOrder: number) {
    if (!Number.isInteger(nextOrder)) return
    try {
      const { error } = await createClient().from('trip_photos').update({ display_order: nextOrder }).eq('id', photo.id)
      if (error) throw error
      router.refresh()
    } catch {
      setFailed(true)
      setMessage('تعذر تحديث الترتيب.')
    }
  }

  return <div className="mt-6 grid gap-5">
    <section className="min-w-0 rounded-xl border border-[#617A55]/15 bg-white p-4 sm:p-6">
      <h2 className="font-serif text-2xl text-[#617A55]">صورة الغلاف</h2>
      <div className="mt-4 flex flex-wrap items-end gap-4">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="غلاف المشوار الحالي" className="h-24 w-36 rounded-lg object-cover" />
        ) : <p className="text-sm text-[#617A55]">لا توجد صورة غلاف بعد.</p>}
        <form onSubmit={saveCover} className="grid w-full min-w-0 max-w-sm gap-3">
          <label className="text-sm">اختاري صورة الغلاف<input name="cover" type="file" accept="image/png,image/jpeg,image/webp" required disabled={busy} className={inputStyle} /></label>
          <div><button disabled={busy} className={buttonStyle}>حفظ الغلاف</button></div>
        </form>
      </div>
    </section>
    {message && <p role={failed ? 'alert' : 'status'} className={`rounded-lg p-3 text-sm ${failed ? 'bg-[#C7D6E8]/50' : 'bg-[#D6E2B6]/50'}`}>{message}</p>}
    <section className="min-w-0 rounded-xl border border-[#617A55]/15 bg-white p-4 sm:p-6">
      <h2 className="font-serif text-2xl text-[#617A55]">معرض صور المشوار</h2>

      {photos && <form onSubmit={upload} className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm">صورة جديدة<input name="image" type="file" accept="image/png,image/jpeg,image/webp" required className={inputStyle} /></label>
        <label className="text-sm">وصف الصورة (اختياري)<input name="caption" maxLength={300} className={inputStyle} /></label>
        <div className="sm:col-span-2"><button disabled={busy} className={buttonStyle}>{busy ? 'جارٍ الرفع…' : 'رفع الصورة'}</button></div>
      </form>}

      {!photos ? (
        <p role="alert" className="mt-4 rounded-lg bg-[#C7D6E8]/50 p-5">تعذر تحميل صور المشوار.</p>
      ) : !photos.length ? (
        <p className="mt-4 text-sm text-[#617A55]/70">لا توجد صور بعد.</p>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...photos].sort((a, b) => a.display_order - b.display_order).map((photo) => (
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
                    onBlur={(event) => void saveOrder(photo, Number(event.currentTarget.value))}
                    className="w-16 rounded-lg border border-[#617A55]/25 bg-[#F7F6F0] px-2 py-1 text-sm"
                  />
                </label>
                <TripDeleteButton rpc="admin_delete_trip_photo" id={photo.id} label="صورة المشوار" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  </div>
}

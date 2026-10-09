'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ClassRecord } from './catalog-editor'

export type SessionRecord = { id: string; session_date: string; start_time: string; end_time: string; capacity: number; booked_count: number; status: string; classes: { name: string } | null }
export type BookingContact = { id: string; session_id: string; profiles: { full_name: string | null; phone: string | null } | null }
const fieldStyle = 'mt-2 w-full min-w-0 rounded-lg border border-[#617A55]/25 bg-[#F7F6F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#617A55]'
const buttonStyle = 'inline-flex items-center justify-center gap-2 rounded-lg bg-[#617A55] px-4 py-2 text-sm text-white disabled:opacity-50'

export function endTime(start: string, duration: number) {
  if (!/^\d{2}:\d{2}$/.test(start) || !Number.isFinite(duration) || duration <= 0) return null
  const [hour, minute] = start.split(':').map(Number)
  const total = hour * 60 + minute + duration
  if (hour > 23 || minute > 59 || total >= 1440 || !Number.isInteger(total)) return null
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function CreateSession({ classes, today }: { classes: ClassRecord[]; today: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  const [classId, setClassId] = useState('')
  const [start, setStart] = useState('')
  const selected = classes.find(item => item.id === classId)
  const end = selected ? endTime(start, selected.duration_minutes) : null

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const capacity = Number(form.get('capacity'))
    const date = String(form.get('date'))
    if (!selected || !end || !Number.isInteger(capacity) || capacity < 1 || date < today) {
      setFailed(true); setMessage('تحققي من التاريخ والسعة ومدة الحصة. يجب أن تنتهي الحصة في اليوم نفسه.'); return
    }
    setBusy(true); setMessage('')
    try {
      const { error } = await createClient().from('class_sessions').insert({ class_id: classId, session_date: date, start_time: start, end_time: end, capacity, booked_count: 0, status: 'scheduled', location: String(form.get('location') || '').trim() || null }).select('id').single()
      if (error) throw error
      setFailed(false); setMessage('تم إنشاء الموعد.'); setOpen(false); setClassId(''); setStart(''); router.refresh()
    } catch { setFailed(true); setMessage('تعذر إنشاء الموعد. تحققي من الاتصال وتطبيق سياسات الإدارة.') }
    finally { setBusy(false) }
  }

  return <section aria-label="إنشاء موعد" className="py-6">
    {!open ? <button onClick={() => { setOpen(true); setMessage('') }} disabled={!classes.length} className={buttonStyle}>إنشاء موعد</button> : <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm">الحصة<select required value={classId} onChange={e => setClassId(e.target.value)} className={fieldStyle}><option value="" disabled>اختاري الحصة</option>{classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-sm">التاريخ<input required type="date" name="date" min={today} className={fieldStyle} /></label>
      <label className="text-sm">وقت البداية<input required type="time" value={start} onChange={e => setStart(e.target.value)} className={fieldStyle} /></label>
      <label className="text-sm">السعة<input required type="number" name="capacity" min="1" max="2147483647" step="1" className={fieldStyle} /></label>
      <label className="text-sm">المكان (اختياري)<input name="location" maxLength={500} className={fieldStyle} /></label>
      <p className="self-center text-sm text-[#617A55]">وقت النهاية: <bdi>{end || '—'}</bdi></p>
      <div className="flex gap-2 sm:col-span-2 lg:col-span-3"><button disabled={busy} className={buttonStyle}>{busy ? 'جارٍ الحفظ…' : 'حفظ الموعد'}</button><button type="button" disabled={busy} onClick={() => setOpen(false)} className="rounded-lg border border-[#617A55]/25 px-4 py-2 text-sm">إلغاء</button></div>
    </form>}
    {message && <p role={failed ? 'alert' : 'status'} className={`mt-3 rounded-lg p-3 text-sm ${failed ? 'bg-[#C7D6E8]/50' : 'bg-[#D6E2B6]/50'}`}>{message}</p>}
  </section>
}

export function SessionControls({ session, contacts, contactsError }: { session: SessionRecord; contacts: BookingContact[]; contactsError: boolean }) {
  const router = useRouter()
  const [capacity, setCapacity] = useState(String(session.capacity))
  const [cancelled, setCancelled] = useState(session.status === 'cancelled')
  const [people, setPeople] = useState(contacts)
  const [contactError, setContactError] = useState(contactsError)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)

  async function loadContacts() {
    try {
      const { data, error } = await createClient().from('bookings').select('id, session_id, profiles(full_name, phone)').eq('session_id', session.id).in('status', ['pending', 'confirmed']).returns<BookingContact[]>()
      if (error) throw error
      setPeople(data || []); setContactError(false)
    } catch { setContactError(true) }
  }

  async function saveCapacity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextCapacity = Number(capacity)
    if (!capacity.trim() || !Number.isInteger(nextCapacity) || nextCapacity < Math.max(1, session.booked_count) || nextCapacity > 2147483647) {
      setFailed(true); setMessage(`السعة يجب أن تكون عددًا صحيحًا لا يقل عن ${Math.max(1, session.booked_count)}.`); return
    }
    setBusy(true); setMessage('')
    try {
      const { error } = await createClient().from('class_sessions').update({ capacity: nextCapacity }).eq('id', session.id).select('id').single()
      if (error) throw error
      setFailed(false); setMessage('تم تحديث السعة.'); router.refresh()
    } catch (error) {
      setFailed(true)
      const constraint = (error as { code?: string })?.code === '23514'
      setMessage(constraint ? 'لم تُحفظ السعة: لا يمكن خفضها دون عدد الحجوزات الحالي. حدّثي الصفحة وحاولي مجددًا.' : 'تعذر تحديث السعة. تحققي من الاتصال وصلاحيات الإدارة.')
    } finally { setBusy(false) }
  }

  async function cancel() {
    if (!window.confirm('هل تريدين إلغاء هذا الموعد؟ ستبقى الحجوزات محفوظة للتواصل مع أصحابها.')) return
    setBusy(true); setMessage('')
    try {
      const { error } = await createClient().from('class_sessions').update({ status: 'cancelled' }).eq('id', session.id).select('id').single()
      if (error) throw error
      setCancelled(true); setFailed(false); setMessage('تم إلغاء الموعد. تواصلي مع أصحاب الحجوزات أدناه.'); await loadContacts(); router.refresh()
    } catch { setFailed(true); setMessage('تعذر إلغاء الموعد. تحققي من الاتصال وصلاحيات الإدارة.') }
    finally { setBusy(false) }
  }

  return <div className="mt-4 border-t border-[#617A55]/15 pt-4">
    <div className="flex flex-wrap items-end gap-3"><form onSubmit={saveCapacity} className="flex max-w-full flex-wrap items-end gap-2"><label className="text-sm">السعة<input aria-label={`سعة ${session.classes?.name || 'الموعد'}`} type="number" required min={Math.max(1, session.booked_count)} max="2147483647" step="1" value={capacity} onChange={e => setCapacity(e.target.value)} className={`${fieldStyle} max-w-32`} disabled={busy || cancelled} /></label><button className={buttonStyle} disabled={busy || cancelled}>حفظ</button></form>{!cancelled && <button type="button" onClick={cancel} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-[#617A55]/30 px-4 py-2 text-sm disabled:opacity-50">إلغاء الموعد</button>}</div>
    {message && <p role={failed ? 'alert' : 'status'} className={`mt-3 rounded-lg p-3 text-sm ${failed ? 'bg-[#C7D6E8]/50' : 'bg-[#D6E2B6]/50'}`}>{message}</p>}
    {cancelled && <section className="mt-4"><h3 className="text-sm font-semibold text-[#617A55]">الحجوزات النشطة للتواصل</h3>{contactError ? <div role="alert" className="mt-2 text-sm"><p>تعذر تحميل بيانات الحجوزات. تحققي من صلاحيات عرض الحجوزات والملفات الشخصية.</p><button type="button" onClick={async () => { setBusy(true); await loadContacts(); setBusy(false) }} disabled={busy} className="mt-2 underline">إعادة المحاولة</button></div> : !people.length ? <p className="mt-2 text-sm">لا توجد حجوزات نشطة.</p> : <ul className="mt-2 divide-y divide-[#617A55]/15">{people.map(person => <li key={person.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"><span>{person.profiles?.full_name || 'الاسم غير متاح'}</span>{person.profiles?.phone ? <a href={`tel:${person.profiles.phone.replace(/[^+\d]/g, '')}`} className="inline-flex items-center gap-2 text-[#617A55]"><bdi>{person.profiles.phone}</bdi></a> : <span>رقم الهاتف غير متاح</span>}</li>)}</ul>}</section>}
  </div>
}

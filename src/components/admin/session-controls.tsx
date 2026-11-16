'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

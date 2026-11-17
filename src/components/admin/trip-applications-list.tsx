'use client'

import { useState } from 'react'
import NotificationItem from '@/components/admin/notifications/notification-item'
import { useRouter } from 'next/navigation'
import { Mail, MessageCircle } from 'lucide-react'
import { normalizePhoneForWhatsApp } from '@/lib/admin-session-attendees'
import { tripApplicationStatusLabels, type AdminTripApplicationRow, type TripApplicationStatus } from '@/lib/trips'

const buttonStyle = 'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-[#617A55]/30 px-3 py-1.5 text-xs font-medium text-[#617A55] transition hover:bg-[#617A55]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55]'

const STATUS_FILTERS: Array<{ value: TripApplicationStatus | 'all'; label: string }> = [
  { value: 'all', label: 'الكل' },
  { value: 'pending', label: tripApplicationStatusLabels.pending },
  { value: 'approved', label: tripApplicationStatusLabels.approved },
  { value: 'waitlisted', label: tripApplicationStatusLabels.waitlisted },
  { value: 'declined', label: tripApplicationStatusLabels.declined },
  { value: 'withdrawn', label: tripApplicationStatusLabels.withdrawn },
]

const STATUS_BADGE_STYLE: Record<TripApplicationStatus, string> = {
  pending: 'bg-[#D6E2B6]/70 text-[#3f5233]',
  approved: 'bg-[#D6E2B6]/70 text-[#3f5233]',
  waitlisted: 'bg-[#C7D6E8]/70 text-[#3a5068]',
  declined: 'bg-[#E8C7C7]/70 text-[#8a4a4a]',
  withdrawn: 'bg-[#617A55]/15 text-[#617A55]/80',
}

const yesNo = (value: boolean) => (value ? 'نعم' : 'لا')

function ApplicationCard({ application }: { application: AdminTripApplicationRow }) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [note, setNote] = useState(application.admin_note ?? '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)

  const whatsapp = normalizePhoneForWhatsApp(application.phone)

  async function review(status: 'approved' | 'waitlisted' | 'declined') {
    setBusy(true)
    setMessage('')
    setFailed(false)
    try {
      const response = await fetch(`/admin/trip-applications/${application.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note: note || null }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.ok) throw new Error(result?.error ?? 'FAILED')
      setMessage('تم تحديث حالة الطلب.')
      router.refresh()
    } catch {
      setFailed(true)
      setMessage('تعذر تحديث الحالة. تحققي من الاتصال وصلاحيات الإدارة.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="min-w-0 rounded-lg border border-[#617A55]/15 bg-white p-4 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-lg font-semibold text-[#617A55]">{application.full_name}</h3>
          <p className="mt-1 text-sm text-[#617A55]/80">
            <bdi dir="ltr">{application.phone}</bdi>
            {' · '}
            <span dir="ltr">{application.email}</span>
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE_STYLE[application.status]}`}>
          {tripApplicationStatusLabels[application.status]}
        </span>
      </header>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {whatsapp && (
          <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className={buttonStyle}>
            <MessageCircle aria-hidden="true" className="size-3.5" /> واتساب
          </a>
        )}
        <a href={`mailto:${application.email}`} className={buttonStyle}>
          <Mail aria-hidden="true" className="size-3.5" /> إيميل
        </a>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-[#617A55] underline-offset-4 hover:underline"
      >
        {expanded ? 'إخفاء الإجابات' : 'عرض إجابات الاستمارة'}
      </button>

      {expanded && (
        <dl className="mt-3 grid gap-3 rounded-lg bg-[#F7F6F0] p-4 text-sm sm:grid-cols-2">
          <div className="sm:col-span-2"><dt className="font-semibold text-[#617A55]">النيّة من المشاركة</dt><dd className="mt-1 whitespace-pre-wrap break-words">{application.intention}</dd></div>
          <div><dt className="font-semibold text-[#617A55]">حضرت مشاوير سابقًا؟</dt><dd className="mt-1">{yesNo(application.attended_before)}</dd></div>
          {application.attended_details && <div><dt className="font-semibold text-[#617A55]">تفاصيل المشاركة السابقة</dt><dd className="mt-1 whitespace-pre-wrap break-words">{application.attended_details}</dd></div>}
          <div><dt className="font-semibold text-[#617A55]">مرتاحة مع أشخاص غرباء؟</dt><dd className="mt-1">{yesNo(application.comfortable_with_strangers)}</dd></div>
          <div><dt className="font-semibold text-[#617A55]">عملية جراحية خلال 6 أشهر؟</dt><dd className="mt-1">{yesNo(application.surgery_last_6_months)}</dd></div>
          <div><dt className="font-semibold text-[#617A55]">شاركت بحلقات تفريغ مشاعري؟</dt><dd className="mt-1">{yesNo(application.did_emotional_release)}</dd></div>
          <div><dt className="font-semibold text-[#617A55]">تقدر ممارسة أنشطة بدنية؟</dt><dd className="mt-1">{yesNo(application.can_do_physical_activity)}</dd></div>
          <div><dt className="font-semibold text-[#617A55]">ترغب بتجارب جديدة؟</dt><dd className="mt-1">{yesNo(application.wants_new_experiences)}</dd></div>
        </dl>
      )}

      {application.status !== 'withdrawn' && (
        <div className="mt-4 border-t border-[#617A55]/10 pt-4">
          <label className="text-sm">ملاحظة داخلية (لا تظهر لصاحبة الطلب)
            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} maxLength={1000} className="mt-2 w-full min-w-0 rounded-lg border border-[#617A55]/25 bg-[#F7F6F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#617A55]" />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => void review('approved')} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#617A55] px-4 text-sm text-white disabled:opacity-50">قبول</button>
            <button type="button" disabled={busy} onClick={() => void review('waitlisted')} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#617A55]/30 px-4 text-sm text-[#617A55] disabled:opacity-50">قائمة انتظار</button>
            <button type="button" disabled={busy} onClick={() => void review('declined')} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#617A55]/30 px-4 text-sm text-[#617A55] disabled:opacity-50">رفض</button>
          </div>
        </div>
      )}
      {message && <p role={failed ? 'alert' : 'status'} className={`mt-3 rounded-lg p-3 text-sm ${failed ? 'bg-[#C7D6E8]/50' : 'bg-[#D6E2B6]/50'}`}>{message}</p>}
    </article>
  )
}

export default function TripApplicationsList({ applications, selectedId, notificationsAvailable }: { applications: AdminTripApplicationRow[]; selectedId?: string; notificationsAvailable: boolean }) {
  const [filter, setFilter] = useState<TripApplicationStatus | 'all'>('all')
  const visible = filter === 'all' ? applications : applications.filter((item) => item.status === filter)

  return <section className="mt-10">
    <h2 className="font-serif text-2xl text-[#617A55]">طلبات المشاركة</h2>

    <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="تصفية حسب الحالة">
      {STATUS_FILTERS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setFilter(option.value)}
          className={`inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-4 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55] ${filter === option.value ? 'bg-[#617A55] text-[#F7F6F0]' : 'border border-[#617A55]/25 text-[#617A55] hover:bg-[#D6E2B6]/50'}`}
        >
          {option.label}
        </button>
      ))}
    </div>

    {!visible.length ? (
      <p className="mt-6 rounded-lg bg-[#D6E2B6]/40 p-5 text-sm">لا توجد طلبات ضمن هذا التصنيف.</p>
    ) : (
      <div className="mt-4 grid gap-4">
        {visible.map((application) => <NotificationItem key={`${application.id}-${selectedId === application.id}`} kind="trip_application" id={application.id} title={application.full_name} status={tripApplicationStatusLabels[application.status]} initiallyOpen={selectedId === application.id} enabled={notificationsAvailable}>
          <ApplicationCard application={application} />
        </NotificationItem>)}
      </div>
    )}
  </section>
}

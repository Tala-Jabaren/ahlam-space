'use client'

import { useMemo, useState } from 'react'
import { Copy, Download, Mail, MessageCircle } from 'lucide-react'
import {
  attendeeState,
  isActiveAttendee,
  normalizePhoneForWhatsApp,
  type AttendeeRow,
  type AttendeeState,
} from '@/lib/admin-session-attendees'

const STATE_LABELS: Record<AttendeeState, string> = {
  paid: 'مدفوع',
  pending: 'بانتظار الدفع',
  cancelled: 'ملغى',
  expired: 'منتهي',
}
const STATE_BADGE_STYLE: Record<AttendeeState, string> = {
  paid: 'bg-[#D6E2B6]/70 text-[#3f5233]',
  pending: 'bg-[#C7D6E8]/70 text-[#3a5068]',
  cancelled: 'bg-[#E8C7C7]/70 text-[#8a4a4a]',
  expired: 'bg-[#617A55]/15 text-[#617A55]/80',
}

// mailto: URLs get silently truncated or rejected by some mail clients
// well before any formal RFC limit - 1800 characters is a conservative,
// widely-cited safe ceiling that works across Outlook/Gmail/Apple Mail.
const MAILTO_SAFE_LENGTH = 1800

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('ar', {
    timeZone: 'Asia/Jerusalem',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

function buildMailtoBatches(emails: string[], subject: string): string[] {
  const encodedSubject = encodeURIComponent(subject)
  const urlFor = (list: string[]) => `mailto:?bcc=${encodeURIComponent(list.join(','))}&subject=${encodedSubject}`

  const batches: string[] = []
  let current: string[] = []
  for (const email of emails) {
    const candidate = [...current, email]
    if (current.length > 0 && urlFor(candidate).length > MAILTO_SAFE_LENGTH) {
      batches.push(urlFor(current))
      current = [email]
    } else {
      current = candidate
    }
  }
  if (current.length > 0) batches.push(urlFor(current))
  return batches
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can fail silently (permissions, insecure context);
      // the value is still visible on the page for manual copying.
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[#617A55]/30 px-3 py-1.5 text-xs font-medium text-[#617A55] transition hover:bg-[#617A55]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55]"
    >
      <Copy aria-hidden="true" className="size-3.5" />
      {copied ? 'تم النسخ' : label}
    </button>
  )
}

export default function AttendeesClient({
  attendees,
  capacity,
  className,
  dateLabel,
  classId,
  sessionId,
}: {
  attendees: AttendeeRow[]
  capacity: number
  className: string
  dateLabel: string
  classId: string
  sessionId: string
}) {
  const [showAll, setShowAll] = useState(false)

  const activeAttendees = useMemo(() => attendees.filter(isActiveAttendee), [attendees])
  const visibleAttendees = showAll ? attendees : activeAttendees
  const activeEmails = useMemo(
    () => activeAttendees.map((row) => row.email).filter((email): email is string => Boolean(email)),
    [activeAttendees]
  )

  const mailSubject = `${className} - ${dateLabel}`
  const mailtoBatches = useMemo(() => buildMailtoBatches(activeEmails, mailSubject), [activeEmails, mailSubject])

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-serif text-xl text-[#25311f]">
          المسجلات: <bdi>{activeAttendees.length}</bdi> من <bdi>{capacity}</bdi> مقعد
        </p>
        <label className="flex items-center gap-2 text-sm text-[#617A55]">
          <input type="checkbox" checked={showAll} onChange={(event) => setShowAll(event.target.checked)} className="size-4 accent-[#617A55]" />
          إظهار الملغاة والمنتهية
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {activeEmails.length === 0 ? (
          <p className="text-sm text-[#617A55]/70">لا توجد عناوين بريد إلكتروني لمسجلات نشطات بعد.</p>
        ) : mailtoBatches.length === 1 ? (
          <a href={mailtoBatches[0]} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#617A55] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#617A55]/85">
            <Mail aria-hidden="true" className="size-4" /> مراسلة الجميع
          </a>
        ) : (
          mailtoBatches.map((url, index) => (
            <a key={url} href={url} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#617A55] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#617A55]/85">
              <Mail aria-hidden="true" className="size-4" /> مراسلة الجميع - الدفعة {index + 1}
            </a>
          ))
        )}
        <CopyButton value={activeEmails.join(', ')} label="نسخ كل الإيميلات" />
        <a
          href={`/admin/classes/${classId}/sessions/${sessionId}/attendees/export?activeOnly=${showAll ? '0' : '1'}`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[#617A55]/30 px-4 py-2 text-sm font-medium text-[#617A55] transition hover:bg-[#617A55]/10"
        >
          <Download aria-hidden="true" className="size-4" /> تحميل CSV
        </a>
      </div>
      {mailtoBatches.length > 1 && (
        <p className="mt-2 text-xs text-[#617A55]/70">
          تم تقسيم الإيميلات إلى {mailtoBatches.length} دفعات لتجنب تجاوز الحد الأقصى لطول رابط البريد. يمكنك أيضًا استخدام زر النسخ أعلاه.
        </p>
      )}

      {visibleAttendees.length === 0 ? (
        <p className="mt-6 rounded-lg bg-[#D6E2B6]/35 p-6 text-center text-sm text-[#617A55]">
          لا توجد تسجيلات لهذه الحصة بعد.
        </p>
      ) : (
        <>
          {/* Table, 640px and up */}
          <div className="mt-6 hidden overflow-x-auto rounded-lg border border-[#617A55]/15 lg:block">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-[#617A55]/15 bg-[#D6E2B6]/20 text-start">
                  <th className="px-4 py-3 text-start font-semibold">الاسم</th>
                  <th className="px-4 py-3 text-start font-semibold">الهاتف</th>
                  <th className="px-4 py-3 text-start font-semibold">البريد الإلكتروني</th>
                  <th className="px-4 py-3 text-start font-semibold">رقم الحجز</th>
                  <th className="px-4 py-3 text-start font-semibold">الحالة</th>
                  <th className="px-4 py-3 text-start font-semibold">تاريخ التسجيل</th>
                  <th className="px-4 py-3 text-start font-semibold">تواصل</th>
                </tr>
              </thead>
              <tbody>
                {visibleAttendees.map((row) => (
                  <AttendeeRowCells key={row.booking_id} row={row} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards, under 640px */}
          <ul className="mt-6 space-y-3 lg:hidden">
            {visibleAttendees.map((row) => (
              <AttendeeCard key={row.booking_id} row={row} />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function ContactActions({ row, primary = false }: { row: AttendeeRow; primary?: boolean }) {
  const whatsapp = normalizePhoneForWhatsApp(row.phone)
  if (!whatsapp && !row.email && !row.phone) return <p className="text-sm text-[#617A55]">بيانات التواصل غير متاحة.</p>
  return (
    <div className="flex flex-wrap items-center gap-2">
      {whatsapp && (
        <a
          href={`https://wa.me/${whatsapp}`}
          target="_blank"
          rel="noreferrer"
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55] ${primary ? 'bg-[#617A55] text-white' : 'border border-[#617A55]/30 text-[#617A55] hover:bg-[#617A55]/10'}`}
        >
          <MessageCircle aria-hidden="true" className="size-3.5" /> واتساب
        </a>
      )}
      {row.email && (
        <a
          href={`mailto:${row.email}`}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55] ${primary && !whatsapp ? 'bg-[#617A55] text-white' : 'border border-[#617A55]/30 text-[#617A55] hover:bg-[#617A55]/10'}`}
        >
          <Mail aria-hidden="true" className="size-3.5" /> إيميل
        </a>
      )}
      {row.phone && <CopyButton value={row.phone} label="نسخ الهاتف" />}
    </div>
  )
}

function AttendeeRowCells({ row }: { row: AttendeeRow }) {
  const state = attendeeState(row)
  return (
    <tr className="border-b border-[#617A55]/10 last:border-0">
      <td className="px-4 py-3">{row.full_name ?? 'بدون اسم'}</td>
      <td className="px-4 py-3" dir="ltr">{row.phone ?? '-'}</td>
      <td className="px-4 py-3" dir="ltr">{row.email ?? '-'}</td>
      <td className="px-4 py-3 font-mono text-xs" dir="ltr">{row.reference ?? '-'}</td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STATE_BADGE_STYLE[state]}`}>
          {STATE_LABELS[state]}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-[#617A55]/80">{formatDateTime(row.created_at)}</td>
      <td className="px-4 py-3"><ContactActions row={row} /></td>
    </tr>
  )
}

function AttendeeCard({ row }: { row: AttendeeRow }) {
  const state = attendeeState(row)
  return (
    <li className="min-w-0 rounded-xl border border-[#617A55]/15 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">{row.full_name ?? 'بدون اسم'}</p>
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STATE_BADGE_STYLE[state]}`}>
          {STATE_LABELS[state]}
        </span>
      </div>
      <dl className="mt-2 space-y-1 text-sm text-[#617A55]/85">
        <div><dt className="sr-only">الهاتف</dt><dd className="break-all"><bdi>{row.phone ?? '-'}</bdi></dd></div>
        <div><dt className="sr-only">البريد الإلكتروني</dt><dd className="break-all"><bdi>{row.email ?? '-'}</bdi></dd></div>
        <div><dt className="sr-only">رقم الحجز</dt><dd className="break-all font-mono text-xs"><bdi>{row.reference ?? '-'}</bdi></dd></div>
        <div><dt className="sr-only">تاريخ التسجيل</dt><dd className="text-xs">{formatDateTime(row.created_at)}</dd></div>
      </dl>
      <div className="mt-4"><ContactActions row={row} primary /></div>
    </li>
  )
}

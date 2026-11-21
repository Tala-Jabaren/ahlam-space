import { adminNotificationHref } from '@/lib/admin-notification-links'
import { escapeHtml, wrapEmailHtml } from './html'

export type OwnerNotificationEventKind = 'booking' | 'session_request' | 'order' | 'course_purchase' | 'trip_application'

export type OwnerNotificationEvent = {
  kind: OwnerNotificationEventKind
  refId: string
  customerName: string | null
  customerPhone: string | null
  details: string
  preferredTimes?: string[]
  amount: number | null
  reference: string | null
  status: string
}

// One email per event (no digest) - each kind gets its own subject line so
// the owner can tell what happened from the inbox list alone, without
// opening it.
const SUBJECT_LABELS: Record<OwnerNotificationEventKind, string> = {
  booking: 'حجز جديد',
  session_request: 'طلب جلسة فردية',
  order: 'طلب جديد من المتجر',
  course_purchase: 'شراء كورس',
  trip_application: 'طلب مشوار جديد',
}

const KIND_LABELS: Record<OwnerNotificationEventKind, string> = {
  booking: 'حجز حصة',
  session_request: 'طلب جلسة فردية',
  order: 'طلب من المتجر',
  course_purchase: 'شراء محاضرة',
  trip_application: 'طلب مشاركة بمشوار',
}

// "pending" means two different things depending on the event kind, so the
// label map is kind-aware rather than shared:
// - booking/order/course_purchase: "pending" is an unpaid bank-transfer
//   event (bank transfer is the only payment method) - called out
//   explicitly so the owner never mistakes "a new event happened" for
//   "it's been paid for".
// - session_request: "pending" just means "submitted, not yet contacted"
//   (see request-status-select.tsx) - there's no payment involved at all,
//   so reusing "بانتظار التحويل" here would be actively misleading.
const FINANCIAL_STATUS_LABELS: Record<string, string> = {
  pending: 'بانتظار التحويل',
  confirmed: 'مؤكد',
  paid: 'مدفوع',
  cancelled: 'ملغي',
  processing: 'قيد التجهيز',
  shipped: 'تم الشحن',
  delivered: 'تم التسليم',
}

const SESSION_REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: 'جديد',
  contacted: 'تم التواصل',
  scheduled: 'تم تحديد موعد',
  closed: 'مغلق',
}

// trip_application: "pending" here means "submitted, awaiting review" -
// same reasoning as session_request's own pending above, and just as
// wrong to label "بانتظار التحويل" (no payment is involved in applying).
const TRIP_APPLICATION_STATUS_LABELS: Record<string, string> = {
  pending: 'قيد المراجعة',
  approved: 'مقبول',
  waitlisted: 'على قائمة الانتظار',
  declined: 'مرفوض',
  withdrawn: 'منسحب',
}

function statusLabel(kind: OwnerNotificationEventKind, status: string) {
  const map =
    kind === 'session_request' ? SESSION_REQUEST_STATUS_LABELS
    : kind === 'trip_application' ? TRIP_APPLICATION_STATUS_LABELS
    : FINANCIAL_STATUS_LABELS
  return map[status] ?? status
}

function formatAmount(amount: number | null) {
  if (amount === null) return null
  return `${new Intl.NumberFormat('ar').format(amount)} ₪`
}

export function buildOwnerNotificationEmail(event: OwnerNotificationEvent, siteUrl: string) {
  const subject = SUBJECT_LABELS[event.kind]
  const amountLabel = formatAmount(event.amount)

  const rows: Array<[string, string]> = [
    ['النوع', KIND_LABELS[event.kind]],
    ['العميلة/العميل', event.customerName ?? 'غير متوفر'],
    ['الهاتف', event.customerPhone ?? 'غير متوفر'],
    ['التفاصيل', event.details],
  ]
  if (event.preferredTimes?.length) {
    rows.push(['المواعيد المقترحة بتوقيت القدس', event.preferredTimes.join('؛ ')])
  }
  if (amountLabel) rows.push(['المبلغ', amountLabel])
  if (event.reference) rows.push(['المرجع', event.reference])
  rows.push(['الحالة', statusLabel(event.kind, event.status)])

  const link = new URL(adminNotificationHref(event.kind, event.refId), siteUrl).toString()

  const html = wrapEmailHtml(`
<p style="font-size:16px;line-height:1.8;margin:0 0 20px;">${escapeHtml(subject)}:</p>
<table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 20px;">
${rows
  .map(
    ([label, value]) => `<tr>
<td style="padding:4px 12px 4px 0;color:#617A55;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
<td style="padding:4px 0;">${escapeHtml(value)}</td>
</tr>`
  )
  .join('\n')}
</table>
<p style="margin:0;">
<a href="${escapeHtml(link)}" style="color:#617A55;font-size:13px;">فتح في لوحة الإدارة</a>
</p>
`)

  const text = [
    `${subject}:`,
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    `الرابط: ${link}`,
  ].join('\n')

  return { subject, html, text }
}

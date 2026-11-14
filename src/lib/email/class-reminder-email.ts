import { escapeHtml, emailFooterHtml, emailFooterText, wrapEmailHtml } from './html'
import { CANCELLATION_POLICY_AR } from './cancellation-policy'

export type ClassReminderData = {
  className: string
  sessionDate: string // 'YYYY-MM-DD'
  startTime: string // 'HH:MM:SS'
  endTime: string // 'HH:MM:SS'
  location: string | null
  reference: string | null
}

// session_date/start_time are already Asia/Jerusalem wall-clock values (see
// book_class_session in admin-payments.sql) - constructing the Date with a
// literal "Z" and formatting with timeZone: 'UTC' displays them exactly as
// stored, with no timezone conversion in either direction. Same pattern as
// member-schedule/page.tsx's formatDate().
export function formatSessionDate(sessionDate: string) {
  const value = new Date(`${sessionDate}T00:00:00Z`)
  return new Intl.DateTimeFormat('ar', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(value)
}

export function formatSessionTime(time: string) {
  return time.slice(0, 5)
}

export function buildClassReminderEmail(data: ClassReminderData, siteUrl: string) {
  const dateLabel = formatSessionDate(data.sessionDate)
  const timeLabel = `${formatSessionTime(data.startTime)} - ${formatSessionTime(data.endTime)}`
  // Matches t.classes.locationFallback (src/i18n/ar.ts) used everywhere else
  // a session's location is displayed, for consistency.
  const locationLabel = data.location ?? 'مركز أحلام'
  const scheduleUrl = `${siteUrl}/member-schedule`
  // Deliberately not "غداً/tomorrow" - REMINDER_HOURS (see
  // src/lib/reminder-constants.ts) is 12, so this can fire same-day too.
  const subject = 'تذكير بحصتك القادمة مع أحلام سبيس'

  const rows: Array<[string, string]> = [
    ['الحصة', data.className],
    ['التاريخ', dateLabel],
    ['الوقت', timeLabel],
    ['الموقع', locationLabel],
  ]
  if (data.reference) {
    rows.push(['رقم الحجز', data.reference])
  }

  const html = wrapEmailHtml(`
<p style="font-size:16px;line-height:1.8;margin:0 0 20px;">تذكير بحصتك القادمة، نراكِ قريبًا!</p>
<table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 24px;font-size:15px;">
${rows
  .map(
    ([label, value]) => `<tr>
<td style="padding:6px 12px 6px 0;color:#617A55;white-space:nowrap;">${escapeHtml(label)}</td>
<td style="padding:6px 0;font-weight:700;">${escapeHtml(value)}</td>
</tr>`
  )
  .join('\n')}
</table>
<p style="margin:0 0 24px;">
<a href="${scheduleUrl}" style="display:inline-block;background-color:#617A55;color:#ffffff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:700;">عرض جدول حصصي</a>
</p>
<p style="font-size:13px;line-height:1.8;color:#617A55;margin:0 0 16px;">${escapeHtml(CANCELLATION_POLICY_AR)}</p>
${emailFooterHtml()}
`)

  const text = [
    'تذكير بحصتك القادمة مع أحلام سبيس',
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    `عرض جدول حصصك: ${scheduleUrl}`,
    '',
    CANCELLATION_POLICY_AR,
    '',
    emailFooterText(),
  ].join('\n')

  return { subject, html, text }
}

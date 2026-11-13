import { escapeHtml, emailFooterHtml, emailFooterText, wrapEmailHtml } from './html'
import { formatTripDate } from '@/components/trips/trip-card'
import { formatMeetingTimeForEmail } from './trip-reminder-email'

export type TripApplicationApprovedData = {
  title: string
  startsOn: string // 'YYYY-MM-DD'
  location: string
  meetingTime: string | null // 'HH:MM:SS' - trip may not have one set yet
  meetingPoint: string | null
}

// No bank-transfer block here (unlike the booking/order payment screens) -
// public.trips has no price column at all (see supabase/trips.sql's own
// note: "the owner hasn't decided on one yet"), so there is never a
// payment actually due for a trip application to mention.
export function buildTripApprovedEmail(data: TripApplicationApprovedData, siteUrl: string) {
  const dateLabel = formatTripDate(data.startsOn)
  const tripsUrl = `${siteUrl}/trips`
  const subject = 'تم تأكيد طلبك، تقدري تيجي معنا'

  const rows: Array<[string, string]> = [
    ['المشوار', data.title],
    ['التاريخ', dateLabel],
    ['الموقع', data.location],
  ]
  if (data.meetingTime) {
    rows.push(['ساعة التجمع', formatMeetingTimeForEmail(data.meetingTime)])
    if (data.meetingPoint) rows.push(['مكان التجمع', data.meetingPoint])
  }

  const meetingNote = data.meetingTime
    ? ''
    : '<p style="margin:0 0 20px;">سنرسل لك ساعة ومكان التجمع بمجرد تحديدهما.</p>'
  const meetingNoteText = data.meetingTime ? '' : 'سنرسل لك ساعة ومكان التجمع بمجرد تحديدهما.\n'

  const html = wrapEmailHtml(`
<p style="font-size:16px;line-height:1.8;margin:0 0 20px;">تم تأكيد طلب مشاركتك، تقدري تيجي معنا! 🌿</p>
<table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 20px;font-size:15px;">
${rows
  .map(
    ([label, value]) => `<tr>
<td style="padding:6px 12px 6px 0;color:#617A55;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
<td style="padding:6px 0;font-weight:700;">${escapeHtml(value)}</td>
</tr>`
  )
  .join('\n')}
</table>
${meetingNote}
<p style="margin:0 0 24px;">
<a href="${tripsUrl}" style="display:inline-block;background-color:#617A55;color:#ffffff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:700;">عرض مشاويري</a>
</p>
${emailFooterHtml()}
`)

  const text = [
    'تم تأكيد طلب مشاركتك، تقدري تيجي معنا!',
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    meetingNoteText.trim(),
    `عرض مشاويري: ${tripsUrl}`,
    '',
    emailFooterText(),
  ]
    .filter(Boolean)
    .join('\n')

  return { subject, html, text }
}

export function buildTripDeclinedEmail(tripTitle: string, siteUrl: string) {
  const tripsUrl = `${siteUrl}/trips`
  const subject = 'بخصوص طلب المشاركة بمشوار ' + tripTitle

  const html = wrapEmailHtml(`
<p style="font-size:16px;line-height:1.8;margin:0 0 20px;">
شكرًا إلك على اهتمامك بمشوار "${escapeHtml(tripTitle)}". للأسف ما قدرنا نضمّك لهذا المشوار بالذات،
بس بنتمنى نشوفك بمشوار قادم. 🌿
</p>
<p style="margin:0 0 24px;">
<a href="${tripsUrl}" style="display:inline-block;background-color:#617A55;color:#ffffff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:700;">تصفّحي المشاوير</a>
</p>
${emailFooterHtml()}
`)

  const text = [
    `شكرًا إلك على اهتمامك بمشوار "${tripTitle}". للأسف ما قدرنا نضمّك لهذا المشوار بالذات، بس بنتمنى نشوفك بمشوار قادم.`,
    '',
    `تصفّحي المشاوير: ${tripsUrl}`,
    '',
    emailFooterText(),
  ].join('\n')

  return { subject, html, text }
}

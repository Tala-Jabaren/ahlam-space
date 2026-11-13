import { escapeHtml, emailFooterHtml, emailFooterText, wrapEmailHtml } from './html'
import { formatTripDate } from '@/components/trips/trip-card'

export type TripReminderData = {
  title: string
  startsOn: string // 'YYYY-MM-DD'
  location: string
  meetingTime: string // 'HH:MM:SS' - callers only build this when it's set
  meetingPoint: string | null
}

export function formatMeetingTimeForEmail(time: string) {
  return time.slice(0, 5)
}

export function buildTripReminderEmail(data: TripReminderData, siteUrl: string) {
  const dateLabel = formatTripDate(data.startsOn)
  const meetingTimeLabel = formatMeetingTimeForEmail(data.meetingTime)
  const tripsUrl = `${siteUrl}/trips`
  const subject = 'تذكير بمشوارك القادم مع أحلام سبيس'

  const rows: Array<[string, string]> = [
    ['المشوار', data.title],
    ['التاريخ', dateLabel],
    ['ساعة التجمع', meetingTimeLabel],
    ['الموقع', data.location],
  ]
  if (data.meetingPoint) {
    rows.push(['مكان التجمع', data.meetingPoint])
  }

  const html = wrapEmailHtml(`
<p style="font-size:16px;line-height:1.8;margin:0 0 20px;">تذكير بمشوارك القادم، نراكِ قريبًا!</p>
<table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 24px;font-size:15px;">
${rows
  .map(
    ([label, value]) => `<tr>
<td style="padding:6px 12px 6px 0;color:#617A55;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
<td style="padding:6px 0;font-weight:700;">${escapeHtml(value)}</td>
</tr>`
  )
  .join('\n')}
</table>
<p style="margin:0 0 24px;">
<a href="${tripsUrl}" style="display:inline-block;background-color:#617A55;color:#ffffff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:700;">عرض مشاويري</a>
</p>
${emailFooterHtml()}
`)

  const text = [
    'تذكير بمشوارك القادم مع أحلام سبيس',
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    `عرض مشاويري: ${tripsUrl}`,
    '',
    emailFooterText(),
  ].join('\n')

  return { subject, html, text }
}

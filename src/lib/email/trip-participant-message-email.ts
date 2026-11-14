import { escapeHtml, emailFooterHtml, emailFooterText, wrapEmailHtml } from './html'

// Renders the admin's free-text message safely: escape first (so no raw
// HTML/script from the textarea ever reaches the email), THEN turn
// newlines into <br> - never the other way around, or a literal "<br>"
// typed by the admin would escape back into a real line break.
function safeMultilineHtml(value: string): string {
  return escapeHtml(value).replace(/\n/g, '<br>')
}

export function buildTripParticipantMessageEmail(
  tripTitle: string,
  subject: string,
  body: string,
  siteUrl: string
) {
  const tripsUrl = `${siteUrl}/trips`

  const html = wrapEmailHtml(`
<p style="font-size:13px;color:#617A55;margin:0 0 12px;">بخصوص مشوار: ${escapeHtml(tripTitle)}</p>
<p style="font-size:16px;line-height:1.8;margin:0 0 20px;">${safeMultilineHtml(body)}</p>
<p style="margin:0 0 24px;">
<a href="${tripsUrl}" style="display:inline-block;background-color:#617A55;color:#ffffff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:700;">عرض مشاويري</a>
</p>
${emailFooterHtml()}
`)

  const text = [
    `بخصوص مشوار: ${tripTitle}`,
    '',
    body,
    '',
    `عرض مشاويري: ${tripsUrl}`,
    '',
    emailFooterText(),
  ].join('\n')

  return { subject, html, text }
}

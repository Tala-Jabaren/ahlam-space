// Shared HTML helpers for every transactional email this app sends.
import { PHONE_DISPLAY, PHONE_E164, SUPPORT_EMAIL, WHATSAPP_URL } from '@/content/site-contact'

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Shared contact footer for every CUSTOMER-facing email (reminders, trip
// approved/declined) - never used on the owner's own notification email,
// which isn't a "contact us" context. Phone/WhatsApp from site-contact.ts;
// the support address here is the public one (SUPPORT_EMAIL).
export function emailFooterHtml(): string {
  return `<p style="font-size:13px;line-height:1.8;color:#617A55;margin:16px 0 0;">
للتواصل: <a href="tel:${PHONE_E164}" style="color:#617A55;">${PHONE_DISPLAY}</a>
· <a href="${WHATSAPP_URL}" style="color:#617A55;">واتساب</a>
· <a href="mailto:${SUPPORT_EMAIL}" style="color:#617A55;">${SUPPORT_EMAIL}</a>
</p>`
}

export function emailFooterText(): string {
  return `للتواصل: ${PHONE_DISPLAY} / واتساب: ${WHATSAPP_URL} / ${SUPPORT_EMAIL}`
}

// Minimal, table-free, RTL email shell. Inline styles throughout (email
// clients strip <style> blocks and external stylesheets unpredictably).
export function wrapEmailHtml(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>مساحة أحلام</title>
</head>
<body style="margin:0;padding:0;background-color:#F7F6F0;font-family:Tahoma,Arial,sans-serif;color:#25311f;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;" dir="rtl">
<h1 style="font-size:20px;color:#617A55;margin:0 0 20px;font-weight:700;">مساحة أحلام</h1>
${bodyHtml}
</div>
</body>
</html>`
}

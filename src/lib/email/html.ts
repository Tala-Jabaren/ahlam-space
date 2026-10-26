// Shared HTML helpers for every transactional email this app sends.

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
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

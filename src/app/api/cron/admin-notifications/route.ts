import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { createMailer, sendEmail } from '@/lib/email/mailer'
import { buildOwnerDigestEmail } from '@/lib/email/owner-digest-email'
import { loadNotificationEvent, type NotificationQueueRow } from '@/lib/admin-notifications'
import type { OwnerDigestEvent } from '@/lib/email/owner-digest-email'
import { SITE_URL } from '@/lib/seo'

const DEFAULT_ADMIN_NOTIFY_EMAIL = 'nmi.ahlam@gmail.com'

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  return Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`
}

// GET /api/cron/admin-notifications[?dry=1]
// Claims every queued booking/order/session-request/course-purchase event
// and sends the owner ONE digest email covering all of them. Never logs a
// customer name, phone number, or email address - only counts.
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return new Response(null, { status: 401 })
  }

  const dry = new URL(request.url).searchParams.get('dry') === '1'
  const supabase = createAdminClient()

  if (dry) {
    const { data, error } = await supabase.rpc('count_pending_admin_notifications')
    if (error) {
      console.error('admin-notifications: count_pending_admin_notifications failed.')
      return Response.json({ error: 'count_failed' }, { status: 500 })
    }
    return Response.json({ dry: true, pending: (data ?? 0) as number })
  }

  const { data, error } = await supabase.rpc('claim_admin_notifications', { p_limit: 50 })
  if (error) {
    console.error('admin-notifications: claim_admin_notifications failed.')
    return Response.json({ error: 'claim_failed' }, { status: 500 })
  }

  const rows = (data ?? []) as NotificationQueueRow[]
  const claimedIds = rows.map((row) => row.id)

  if (rows.length === 0) {
    return Response.json({ claimed: 0, events: 0, sent: false })
  }

  const events: OwnerDigestEvent[] = []
  for (const row of rows) {
    const event = await loadNotificationEvent(supabase, row)
    if (event) events.push(event)
  }

  // Every claimed row was legitimately evaluated (e.g. a booking that's
  // since been cancelled is correctly skipped, not a failure) - nothing
  // left to send, nothing to release.
  if (events.length === 0) {
    return Response.json({ claimed: rows.length, events: 0, sent: false })
  }

  let mailer
  try {
    mailer = createMailer()
  } catch {
    await supabase.rpc('release_admin_notifications', { p_ids: claimedIds })
    console.error('admin-notifications: mailer not configured.')
    return Response.json(
      { error: 'mailer_not_configured', claimed: rows.length, released: claimedIds.length },
      { status: 502 }
    )
  }

  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || DEFAULT_ADMIN_NOTIFY_EMAIL
  const { subject, html, text } = buildOwnerDigestEmail(events, SITE_URL)

  try {
    const { error: sendError } = await sendEmail(mailer, { to: [adminEmail], subject, html, text })
    if (sendError) {
      throw new Error('send_failed')
    }
  } catch {
    await supabase.rpc('release_admin_notifications', { p_ids: claimedIds })
    console.error('admin-notifications: send failed.')
    return Response.json(
      { error: 'send_failed', claimed: rows.length, released: claimedIds.length },
      { status: 502 }
    )
  }

  return Response.json({ claimed: rows.length, events: events.length, sent: true })
}

import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { createMailer, sendEmail } from '@/lib/email/mailer'
import { buildOwnerNotificationEmail } from '@/lib/email/owner-notification-email'
import { loadNotificationEvent, type NotificationQueueRow } from '@/lib/admin-notifications'
import { isAuthorizedCronRequest } from '@/lib/cron-auth'
import { SITE_URL } from '@/lib/seo'

const DEFAULT_ADMIN_NOTIFY_EMAIL = 'nmi.ahlam@gmail.com'

// See src/app/api/cron/class-reminders/route.ts for why these two are set -
// same reasoning applies here (this route's own claim is already capped at
// p_limit: 50 below, so 60s is comfortably enough even sending one email
// per row instead of a single batched one).
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CLAIM_BATCH_SIZE = 50

// GET /api/cron/admin-notifications[?dry=1]
// Claims every queued booking/order/session-request/course-purchase/trip-
// application event and sends the owner ONE SEPARATE email per event (no
// digest) - claim_admin_notifications already caps retries at 5 attempts
// (see supabase/class-reminders.sql), so a row that keeps failing to send
// eventually stops being retried on its own; a single failed row is
// released and retried on the next run without blocking any other row in
// the same batch. Never logs a customer name, phone number, or email
// address - only counts.
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
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

  const { data, error } = await supabase.rpc('claim_admin_notifications', { p_limit: CLAIM_BATCH_SIZE })
  if (error) {
    console.error('admin-notifications: claim_admin_notifications failed.')
    return Response.json({ error: 'claim_failed' }, { status: 500 })
  }

  const rows = (data ?? []) as NotificationQueueRow[]

  if (rows.length === 0) {
    return Response.json({ claimed: 0, sent: 0, failed: 0, skipped: 0 })
  }

  let mailer
  try {
    mailer = createMailer()
  } catch {
    // Can't send anything this run - release every claimed row so they're
    // picked up again on the next run instead of silently losing them.
    await supabase.rpc('release_admin_notifications', { p_ids: rows.map((row) => row.id) })
    console.error('admin-notifications: mailer not configured.')
    return Response.json(
      { error: 'mailer_not_configured', claimed: rows.length, released: rows.length },
      { status: 500 }
    )
  }

  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || DEFAULT_ADMIN_NOTIFY_EMAIL

  let sent = 0
  let failed = 0
  let skipped = 0

  for (const row of rows) {
    try {
      // "Found" = loadNotificationEvent resolved a real record (possibly
      // still worth emailing). "Skipped" = the referenced record is gone
      // (deleted order/booking/etc.) or, for a booking, already cancelled -
      // there's nothing to retry there, so this row stays marked sent, no
      // release, no email.
      const event = await loadNotificationEvent(supabase, row)
      if (!event) {
        skipped += 1
        continue
      }

      const { subject, html, text } = buildOwnerNotificationEmail(event, SITE_URL)
      const { error: sendError } = await sendEmail(mailer, { to: [adminEmail], subject, html, text })
      if (sendError) {
        throw new Error('send_failed')
      }

      sent += 1
    } catch {
      failed += 1
      await supabase.rpc('release_admin_notifications', { p_ids: [row.id] })
    }
  }

  return Response.json({ claimed: rows.length, sent, failed, skipped })
}

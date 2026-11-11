import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { createMailer, sendEmail } from '@/lib/email/mailer'
import { buildClassReminderEmail } from '@/lib/email/class-reminder-email'
import { isAuthorizedCronRequest } from '@/lib/cron-auth'
import { SITE_URL } from '@/lib/seo'

// Never cached, never statically rendered (Vercel Cron needs a fresh read
// every run regardless of this Next version's route-handler caching
// defaults) and bounded well under Vercel's function timeout even on a
// Hobby plan (see docs/DEPLOY-STEPS.md for the actual plan-dependent cap -
// raise this if CLAIM_BATCH_SIZE below is ever raised too).
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Matches admin-notifications' p_limit: 50 - caps how many bookings a
// single run can claim+email, so one run can never claim an unbounded
// backlog (e.g. after an outage) and risk running past maxDuration with
// reminders already claimed but not yet sent.
const CLAIM_BATCH_SIZE = 50

type DueReminder = {
  booking_id: string
  user_id: string
  reference: string | null
  class_name: string
  session_date: string
  start_time: string
  end_time: string
  location: string | null
}

// GET /api/cron/class-reminders[?dry=1]
// Sends a reminder email to every member whose confirmed, paid booking
// starts within the next 24h and hasn't been reminded yet. Never logs an
// email address, name, or phone number - only counts.
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return new Response(null, { status: 401 })
  }

  const dry = new URL(request.url).searchParams.get('dry') === '1'
  const supabase = createAdminClient()

  if (dry) {
    const { data, error } = await supabase.rpc('count_due_class_reminders')
    if (error) {
      console.error('class-reminders: count_due_class_reminders failed.')
      return Response.json({ error: 'count_failed' }, { status: 500 })
    }
    return Response.json({ dry: true, due: (data ?? 0) as number })
  }

  const { data, error } = await supabase.rpc('claim_due_class_reminders', {
    p_limit: CLAIM_BATCH_SIZE,
  })
  if (error) {
    console.error('class-reminders: claim_due_class_reminders failed.')
    return Response.json({ error: 'claim_failed' }, { status: 500 })
  }

  const reminders = (data ?? []) as DueReminder[]

  let mailer
  try {
    mailer = createMailer()
  } catch {
    // Can't send anything this run - release every claimed booking so
    // they're picked up again (still due) on the next run instead of
    // silently losing their reminder.
    await Promise.all(
      reminders.map((reminder) =>
        supabase.rpc('release_class_reminder', { p_booking_id: reminder.booking_id })
      )
    )
    console.error('class-reminders: mailer not configured.')
    return Response.json(
      { error: 'mailer_not_configured', claimed: reminders.length, released: reminders.length },
      { status: 500 }
    )
  }

  let sent = 0
  let failed = 0

  for (const reminder of reminders) {
    try {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
        reminder.user_id
      )
      const email = userData?.user?.email
      if (userError || !email) {
        throw new Error('no_email')
      }

      const { subject, html, text } = buildClassReminderEmail(
        {
          className: reminder.class_name,
          sessionDate: reminder.session_date,
          startTime: reminder.start_time,
          endTime: reminder.end_time,
          location: reminder.location,
          reference: reminder.reference,
        },
        SITE_URL
      )

      const { error: sendError } = await sendEmail(mailer, { to: [email], subject, html, text })
      if (sendError) {
        throw new Error('send_failed')
      }

      sent += 1
    } catch {
      failed += 1
      await supabase.rpc('release_class_reminder', { p_booking_id: reminder.booking_id })
    }
  }

  return Response.json({ dry: false, claimed: reminders.length, sent, failed })
}

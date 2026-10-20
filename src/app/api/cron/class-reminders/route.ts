import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { createMailer, sendEmail } from '@/lib/email/mailer'
import { buildClassReminderEmail } from '@/lib/email/class-reminder-email'
import { SITE_URL } from '@/lib/seo'

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

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  return Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`
}

// GET /api/cron/class-reminders[?dry=1]
// Sends a reminder email to every member whose confirmed, paid booking
// starts within the next 24h and hasn't been reminded yet. Never logs an
// email address, name, or phone number - only counts.
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
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

  const { data, error } = await supabase.rpc('claim_due_class_reminders')
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

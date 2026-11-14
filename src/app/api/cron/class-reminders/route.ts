import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { createMailer, sendEmail } from '@/lib/email/mailer'
import { buildClassReminderEmail } from '@/lib/email/class-reminder-email'
import { buildTripReminderEmail } from '@/lib/email/trip-reminder-email'
import { isAuthorizedCronRequest } from '@/lib/cron-auth'
import { REMINDER_HOURS } from '@/lib/reminder-constants'
import { SITE_URL } from '@/lib/seo'

// Never cached, never statically rendered (Vercel Cron needs a fresh read
// every run regardless of this Next version's route-handler caching
// defaults) and bounded well under Vercel's function timeout even on a
// Hobby plan (see docs/DEPLOY-STEPS.md for the actual plan-dependent cap -
// raise this if CLAIM_BATCH_SIZE below is ever raised too).
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Matches admin-notifications' p_limit: 50 - caps how many bookings/
// applications a single run can claim+email, so one run can never claim an
// unbounded backlog (e.g. after an outage) and risk running past
// maxDuration with reminders already claimed but not yet sent. Applied
// separately to class reminders and trip reminders - one kind having a
// backlog never crowds out the other.
const CLAIM_BATCH_SIZE = 50

type DueClassReminder = {
  booking_id: string
  user_id: string
  reference: string | null
  class_name: string
  session_date: string
  start_time: string
  end_time: string
  location: string | null
}

type DueTripReminder = {
  application_id: string
  email: string
  trip_title: string
  starts_on: string
  location: string
  meeting_time: string
  meeting_point: string | null
}

async function sendClassReminders(
  supabase: ReturnType<typeof createAdminClient>,
  mailer: Awaited<ReturnType<typeof createMailer>>
) {
  const { data, error } = await supabase.rpc('claim_due_class_reminders', {
    p_hours: REMINDER_HOURS,
    p_limit: CLAIM_BATCH_SIZE,
  })
  if (error) {
    console.error('class-reminders: claim_due_class_reminders failed.')
    return { claimed: 0, sent: 0, failed: 0, error: true }
  }

  const reminders = (data ?? []) as DueClassReminder[]
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
      if (sendError) throw new Error('send_failed')

      sent += 1
    } catch {
      failed += 1
      await supabase.rpc('release_class_reminder', { p_booking_id: reminder.booking_id })
    }
  }

  return { claimed: reminders.length, sent, failed, error: false }
}

async function sendTripReminders(
  supabase: ReturnType<typeof createAdminClient>,
  mailer: Awaited<ReturnType<typeof createMailer>>
) {
  const { data, error } = await supabase.rpc('claim_due_trip_reminders', {
    p_hours: REMINDER_HOURS,
    p_limit: CLAIM_BATCH_SIZE,
  })
  if (error) {
    console.error('class-reminders: claim_due_trip_reminders failed.')
    return { claimed: 0, sent: 0, failed: 0, error: true }
  }

  const reminders = (data ?? []) as DueTripReminder[]
  let sent = 0
  let failed = 0

  for (const reminder of reminders) {
    try {
      const { subject, html, text } = buildTripReminderEmail(
        {
          title: reminder.trip_title,
          startsOn: reminder.starts_on,
          location: reminder.location,
          meetingTime: reminder.meeting_time,
          meetingPoint: reminder.meeting_point,
        },
        SITE_URL
      )

      const { error: sendError } = await sendEmail(mailer, {
        to: [reminder.email],
        subject,
        html,
        text,
      })
      if (sendError) throw new Error('send_failed')

      sent += 1
    } catch {
      failed += 1
      await supabase.rpc('release_trip_reminder', { p_application_id: reminder.application_id })
    }
  }

  return { claimed: reminders.length, sent, failed, error: false }
}

// GET /api/cron/class-reminders[?dry=1]
// Sends a reminder email REMINDER_HOURS before: a member's confirmed, paid
// class booking starts, and an approved trip application's trip meeting
// time (only when the trip actually has one set - see
// claim_due_trip_reminders). One route, both kinds - prefer extending this
// existing hourly cron over adding a second one. Never logs an email
// address, name, or phone number - only counts.
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return new Response(null, { status: 401 })
  }

  const dry = new URL(request.url).searchParams.get('dry') === '1'
  const supabase = createAdminClient()

  if (dry) {
    const [classesResult, tripsResult] = await Promise.all([
      supabase.rpc('count_due_class_reminders', { p_hours: REMINDER_HOURS }),
      supabase.rpc('count_due_trip_reminders', { p_hours: REMINDER_HOURS }),
    ])
    if (classesResult.error || tripsResult.error) {
      console.error('class-reminders: dry-run count failed.')
      return Response.json({ error: 'count_failed' }, { status: 500 })
    }
    return Response.json({
      dry: true,
      classes: { due: (classesResult.data ?? 0) as number },
      trips: { due: (tripsResult.data ?? 0) as number },
    })
  }

  let mailer
  try {
    mailer = createMailer()
  } catch {
    console.error('class-reminders: mailer not configured.')
    return Response.json({ error: 'mailer_not_configured' }, { status: 500 })
  }

  const [classes, trips] = await Promise.all([
    sendClassReminders(supabase, mailer),
    sendTripReminders(supabase, mailer),
  ])

  return Response.json({ dry: false, classes, trips })
}

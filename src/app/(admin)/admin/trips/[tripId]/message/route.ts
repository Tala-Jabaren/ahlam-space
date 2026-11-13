import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createMailer, sendEmail } from '@/lib/email/mailer'
import { buildTripParticipantMessageEmail } from '@/lib/email/trip-participant-message-email'
import { getTripApplications } from '@/lib/trips'
import { SITE_URL } from '@/lib/seo'

const MAX_SUBJECT_LENGTH = 200
const MAX_BODY_LENGTH = 5000

// POST /admin/trips/[tripId]/message
// body: { subject, body, confirm }
//
// confirm: false (or omitted) is a dry run - returns the recipient count
// (every APPROVED applicant on this trip) without sending anything,
// logging anything, or touching the rate limit. The UI shows that count
// and asks the admin to confirm before the real send. confirm: true then
// calls admin_log_trip_message (which checks is_admin() again and enforces
// the rate limit - see supabase/notification-emails.sql) and, only if that
// succeeds, sends ONE SEPARATE email per approved applicant - never a
// shared To/CC, so no recipient ever sees another's address.
export async function POST(request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return Response.json({ error: 'طلب غير مسموح.' }, { status: 403 })
  }

  const { tripId } = await params

  try {
    const client = await createClient()
    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: 'سجّلي الدخول مجددًا.' }, { status: 401 })
    }
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (profileError) {
      return Response.json({ error: 'تعذر التحقق من صلاحيات الإدارة. حاولي مجددًا.' }, { status: 503 })
    }
    if (profile?.role !== 'admin') {
      return Response.json({ error: 'ليست لديك صلاحية تنفيذ هذا الإجراء.' }, { status: 403 })
    }

    let payload: { subject?: unknown; body?: unknown; confirm?: unknown }
    try {
      payload = await request.json()
    } catch {
      return Response.json({ error: 'بيانات غير صالحة.' }, { status: 400 })
    }

    const subject = typeof payload.subject === 'string' ? payload.subject.trim() : ''
    const body = typeof payload.body === 'string' ? payload.body.trim() : ''
    const confirm = payload.confirm === true

    if (!subject || subject.length > MAX_SUBJECT_LENGTH) {
      return Response.json({ error: 'أدخلي عنوان رسالة صالح (حتى 200 حرف).' }, { status: 400 })
    }
    if (!body || body.length > MAX_BODY_LENGTH) {
      return Response.json({ error: 'أدخلي نص رسالة صالح (حتى 5000 حرف).' }, { status: 400 })
    }

    let applications
    try {
      applications = await getTripApplications(client, tripId)
    } catch {
      return Response.json({ error: 'تعذر تحميل طلبات المشاركة.' }, { status: 503 })
    }
    const recipients = applications.filter((application) => application.status === 'approved')

    if (recipients.length === 0) {
      return Response.json({ error: 'لا يوجد مشاركات مقبولات بهذا المشوار حتى الآن.' }, { status: 400 })
    }

    if (!confirm) {
      return Response.json({ recipientCount: recipients.length })
    }

    // Built before logging the send (which counts against the rate limit
    // below) - no point spending one of the admin's 5-per-hour slots on a
    // request that can't send anything anyway.
    let mailer
    try {
      mailer = createMailer()
    } catch {
      return Response.json({ error: 'خدمة البريد غير مُفعّلة حاليًا.' }, { status: 500 })
    }

    const { error: logError } = await client.rpc('admin_log_trip_message', {
      p_trip_id: tripId,
      p_subject: subject,
      p_recipient_count: recipients.length,
    })
    if (logError) {
      const message =
        logError.message === 'RATE_LIMITED'
          ? 'تجاوزتِ الحد المسموح من الرسائل (5 رسائل كل ساعة). حاولي لاحقًا.'
          : logError.message === 'FORBIDDEN'
            ? 'ليست لديك صلاحية تنفيذ هذا الإجراء.'
            : 'تعذر تسجيل الرسالة. حاولي مجددًا.'
      return Response.json({ error: message }, { status: logError.message === 'RATE_LIMITED' ? 429 : 400 })
    }

    const admin = createAdminClient()
    const { data: trip } = await admin.from('trips').select('title').eq('id', tripId).maybeSingle()
    const tripTitle = trip?.title ?? 'المشوار'
    const { subject: emailSubject, html, text } = buildTripParticipantMessageEmail(
      tripTitle,
      subject,
      body,
      SITE_URL
    )

    let sent = 0
    let failed = 0
    for (const recipient of recipients) {
      try {
        const { error: sendError } = await sendEmail(mailer, {
          to: [recipient.email],
          subject: emailSubject,
          html,
          text,
        })
        if (sendError) throw new Error('send_failed')
        sent += 1
      } catch {
        failed += 1
      }
    }

    return Response.json({ ok: true, sent, failed, recipientCount: recipients.length })
  } catch {
    return Response.json({ error: 'تعذر إرسال الرسالة. حاولي مجددًا.' }, { status: 500 })
  }
}

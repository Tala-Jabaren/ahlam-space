import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createMailer, sendEmail } from '@/lib/email/mailer'
import { buildTripApprovedEmail, buildTripDeclinedEmail } from '@/lib/email/trip-application-email'
import { SITE_URL } from '@/lib/seo'

const VALID_STATUSES = new Set(['approved', 'waitlisted', 'declined'])

// Wraps admin_review_trip_application (supabase/trips.sql) so this server
// route - not the browser - is the one that triggers the approved/
// declined email right after a successful status change. The RPC itself
// is called with the admin's own session (not the service role), since
// its is_admin() check is the real trust boundary; this route's own
// origin/auth/role check below is the same belt-and-suspenders pattern
// already used in src/app/(admin)/admin/trips/upload-photo/route.ts.
//
// A failed email must never undo or fail the review itself - the status
// change already committed by the time we try to send anything, so every
// email failure below is caught, logged (no PII), and still returns ok:
// true for the review.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return Response.json({ error: 'طلب غير مسموح.' }, { status: 403 })
  }

  const { id } = await params

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

    let body: { status?: unknown; note?: unknown }
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'بيانات غير صالحة.' }, { status: 400 })
    }

    const status = typeof body.status === 'string' ? body.status : ''
    if (!VALID_STATUSES.has(status)) {
      return Response.json({ error: 'حالة غير صالحة.' }, { status: 400 })
    }
    const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null

    const { error: reviewError } = await client.rpc('admin_review_trip_application', {
      p_id: id,
      p_status: status,
      p_note: note,
    })
    if (reviewError) {
      const message =
        reviewError.message === 'FORBIDDEN'
          ? 'ليست لديك صلاحية تنفيذ هذا الإجراء.'
          : reviewError.message === 'RECORD_NOT_FOUND'
            ? 'الطلب غير موجود.'
            : 'تعذر تحديث الحالة. تحققي من الاتصال وصلاحيات الإدارة.'
      return Response.json({ error: message }, { status: reviewError.message === 'FORBIDDEN' ? 403 : 400 })
    }

    // Only approved/declined get an automatic email - waitlisted has no
    // email per the brief (the member sees the status on /trips either way).
    if (status === 'approved' || status === 'declined') {
      try {
        await sendApplicationStatusEmail(id, status)
      } catch (error) {
        console.error('trip-applications/review: failed to send status email.', error instanceof Error ? error.message : '')
      }
    }

    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: 'تعذر تنفيذ هذا الإجراء. حاولي مجددًا.' }, { status: 500 })
  }
}

async function sendApplicationStatusEmail(applicationId: string, status: 'approved' | 'declined') {
  const admin = createAdminClient()
  const { data: application } = await admin
    .from('trip_applications')
    .select('email, trip_id')
    .eq('id', applicationId)
    .maybeSingle()
  if (!application) return

  const { data: trip } = await admin
    .from('trips')
    .select('title, starts_on, location, meeting_time, meeting_point')
    .eq('id', application.trip_id)
    .maybeSingle()
  if (!trip) return

  const mailer = createMailer()
  const { subject, html, text } =
    status === 'approved'
      ? buildTripApprovedEmail(
          {
            title: trip.title,
            startsOn: trip.starts_on,
            location: trip.location,
            meetingTime: trip.meeting_time,
            meetingPoint: trip.meeting_point,
          },
          SITE_URL
        )
      : buildTripDeclinedEmail(trip.title, SITE_URL)

  await sendEmail(mailer, { to: [application.email], subject, html, text })
}

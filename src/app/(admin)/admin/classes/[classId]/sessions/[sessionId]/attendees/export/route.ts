import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { attendeeState, getSessionAttendees, isActiveAttendee, type AttendeeRow } from '@/lib/admin-session-attendees'
import { buildCsv, type ColumnDef } from '@/lib/customers-export'

const STATE_LABELS: Record<string, string> = {
  paid: 'مدفوع',
  pending: 'بانتظار الدفع',
  cancelled: 'ملغى',
  expired: 'منتهي',
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('ar', {
    timeZone: 'Asia/Jerusalem',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

function attendeeColumns(): ColumnDef<AttendeeRow>[] {
  return [
    { header: 'الاسم', value: (r) => r.full_name ?? '' },
    { header: 'الهاتف', value: (r) => r.phone ?? '' },
    { header: 'البريد الإلكتروني', value: (r) => r.email ?? '' },
    { header: 'رقم الحجز', value: (r) => r.reference ?? '' },
    { header: 'الحالة', value: (r) => STATE_LABELS[attendeeState(r)] ?? attendeeState(r) },
    { header: 'تاريخ التسجيل', value: (r) => formatDateTime(r.created_at) },
  ]
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string; sessionId: string }> }
) {
  const { sessionId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response(null, { status: 403 })
  }

  // Server-side admin check, same pattern as
  // admin/customers/export/route.ts - getAdminSession() redirects, which
  // isn't right for a download endpoint, so this repeats its check and
  // returns 403 instead.
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()

  if (profile?.role !== 'admin') {
    return new Response(null, { status: 403 })
  }

  const activeOnly = request.nextUrl.searchParams.get('activeOnly') !== '0'

  try {
    const attendees = await getSessionAttendees(supabase, sessionId)
    const rows = activeOnly ? attendees.filter(isActiveAttendee) : attendees
    const body = buildCsv(attendeeColumns(), rows)
    const filename = `session-attendees-${sessionId}.csv`

    return new Response(new Uint8Array(body), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    // Never log personal data: no row contents, just a flat message.
    console.error('Admin session attendees export failed.')
    return new Response('Export failed', { status: 500 })
  }
}

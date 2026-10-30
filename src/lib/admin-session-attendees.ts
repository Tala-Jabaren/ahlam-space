import type { SupabaseClient } from '@supabase/supabase-js'

export type AttendeeRow = {
  booking_id: string
  reference: string | null
  status: string
  payment_status: string
  created_at: string
  reserved_until: string | null
  user_id: string
  full_name: string | null
  phone: string | null
  email: string | null
}

export type AttendeeState = 'paid' | 'pending' | 'cancelled' | 'expired'

const FORBIDDEN_MESSAGE = 'ليست لديك صلاحية لتنفيذ هذا الإجراء.'

// Bookings only ever carry 3 raw statuses (pending/confirmed/cancelled) -
// "paid" and "expired" aren't stored, they're derived here so the same rule
// drives both the attendee-count badge on /admin/classes and the status
// badges on the attendees table, instead of two places having to agree by
// coincidence. A 'pending' hold whose reserved_until has already passed is
// functionally dead even though nothing has rewritten its status yet (the
// expiry sweep does that on its own schedule) - "expired" surfaces that
// distinction to the admin instead of showing it as still-pending.
export function attendeeState(row: Pick<AttendeeRow, 'status' | 'reserved_until'>): AttendeeState {
  if (row.status === 'cancelled') return 'cancelled'
  if (row.status === 'confirmed') return 'paid'
  if (row.reserved_until && new Date(row.reserved_until).getTime() < Date.now()) return 'expired'
  return 'pending'
}

export function isActiveAttendee(row: Pick<AttendeeRow, 'status' | 'reserved_until'>): boolean {
  const state = attendeeState(row)
  return state === 'paid' || state === 'pending'
}

export async function getSessionAttendees(
  supabase: SupabaseClient,
  sessionId: string
): Promise<AttendeeRow[]> {
  const { data, error } = await supabase.rpc('admin_list_session_attendees', {
    p_session_id: sessionId,
  })

  if (error) {
    // Same mapping used elsewhere for admin RPCs (see
    // src/components/admin/admin-rpc-button.tsx's KNOWN_ERROR_MESSAGES) -
    // in practice unreachable here since the page itself is already gated
    // by getAdminSession(), but kept as the same defense-in-depth message
    // rather than a raw Postgres error string leaking through.
    if (error.message === 'FORBIDDEN') throw new Error(FORBIDDEN_MESSAGE)
    throw error
  }

  // Not using .returns<T[]>() here: with an untyped SupabaseClient, rpc().
  // returns<T[]>() resolves to the wrong overload - see the same note in
  // src/lib/admin-customers.ts.
  return (data ?? []) as AttendeeRow[]
}

// A number starting with a local trunk "0" is assumed Palestinian (+970) -
// Ahlam Space is based in Ramallah - rather than Israeli (+972); both share
// the same digit-length pattern, so there's no way to tell them apart from
// the digits alone. Numbers already given with a country code (+ or 00
// prefix) are used as-is. Returns null for anything that doesn't look like
// a plausible phone number at all, so the caller can skip the WhatsApp
// link instead of building a broken wa.me URL.
export function normalizePhoneForWhatsApp(raw: string | null): string | null {
  if (!raw) return null
  let digits = raw.trim().replace(/[\s\-().]/g, '')
  if (digits.startsWith('+')) digits = digits.slice(1)
  else if (digits.startsWith('00')) digits = digits.slice(2)
  else if (digits.startsWith('0')) digits = `970${digits.slice(1)}`
  if (!/^\d{8,15}$/.test(digits)) return null
  return digits
}

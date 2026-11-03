import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'

// Shared shapes for public.trips / trip_photos / trip_applications (see
// supabase/trips.sql), used by both the admin trips area and (in a later
// phase) the public/member-facing pages, so they never drift apart.

export type TripStatus = 'draft' | 'open' | 'closed' | 'past'

export type TripRow = {
  id: string
  title: string
  description: string
  location: string
  starts_on: string
  ends_on: string
  application_deadline: string | null
  capacity: number | null
  cover_image_url: string | null
  status: TripStatus
  created_at: string
}

export type TripPhotoRow = {
  id: string
  trip_id: string
  photo_url: string
  caption: string | null
  display_order: number
  is_published: boolean
  created_at: string
}

export type TripApplicationStatus = 'pending' | 'approved' | 'waitlisted' | 'declined' | 'withdrawn'

// Exactly the columns admin_list_trip_applications() returns - the health/
// comfort answers are included here because this type is for the ADMIN
// view only (the one place they're ever meant to be read back). Never
// reuse this type, or any subset exposing attended_details/intention/the
// boolean answer fields, for anything that could reach a log line, an
// email body, or a public/member-facing response - those must stay out of
// admin_notification_queue, out of console.error/console.log, and out of
// any response sent to a non-admin caller.
export type AdminTripApplicationRow = {
  id: string
  trip_id: string
  full_name: string
  phone: string
  email: string
  attended_before: boolean
  attended_details: string | null
  intention: string
  comfortable_with_strangers: boolean
  surgery_last_6_months: boolean
  did_emotional_release: boolean
  can_do_physical_activity: boolean
  wants_new_experiences: boolean
  status: TripApplicationStatus
  admin_note: string | null
  reviewed_at: string | null
  created_at: string
}

// 'YYYY-MM-DD' for "today" in the trip owner's timezone, matching the plain
// date columns (starts_on/ends_on/application_deadline) exactly so string
// comparison works without a separate date-parsing step. en-CA formats as
// ISO-like YYYY-MM-DD, same trick used elsewhere in this codebase for
// timezone-local "today" strings.
export function todayInHebron(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hebron',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

// Single source of truth for "can someone apply to this trip right now",
// used by the public home section, /trips, and the apply page - a trip can
// be status = 'open' yet no longer actually accepting applications (past
// its own deadline, or past its own end date if the owner forgot to flip
// the status). Callers that need to tell "deadline passed" apart from
// "trip has fully ended" (to decide between showing a closed-for-
// applications card vs. hiding it entirely) should check ends_on
// themselves - this function only answers the single yes/no question.
export function isTripAcceptingApplications(
  trip: Pick<TripRow, 'status' | 'application_deadline' | 'ends_on'>,
  today: string = todayInHebron()
): boolean {
  if (trip.status !== 'open') return false
  if (trip.application_deadline && trip.application_deadline < today) return false
  if (trip.ends_on < today) return false
  return true
}

export const tripStatusLabels: Record<TripStatus, string> = {
  draft: 'مسودة',
  open: 'مفتوح للتسجيل',
  closed: 'مغلق',
  past: 'سابق',
}

// Internal/admin-facing wording. Member-facing wording (gentler phrasing
// for "declined" in particular) is defined separately in a later phase,
// not reused here on purpose.
export const tripApplicationStatusLabels: Record<TripApplicationStatus, string> = {
  pending: 'قيد المراجعة',
  approved: 'مقبول',
  waitlisted: 'على قائمة الانتظار',
  declined: 'مرفوض',
  withdrawn: 'منسحب',
}

// Mirrors submit_trip_application()'s own checks in supabase/trips.sql
// exactly (same length caps, same required fields) - not a replacement
// for them. The RPC is the real trust boundary (it re-validates
// everything server-side regardless of what called it); this schema only
// exists so a future Phase 2 form can give an applicant an inline error
// before round-tripping to the database, and so no caller ever has to
// duplicate these numbers by hand.
export const tripApplicationInputSchema = z.object({
  trip_id: z.uuid(),
  full_name: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(1).max(50),
  email: z.string().trim().min(1).max(200).email(),
  attended_before: z.boolean(),
  attended_details: z.string().trim().max(1000).optional().nullable(),
  intention: z.string().trim().min(1).max(1500),
  comfortable_with_strangers: z.boolean(),
  surgery_last_6_months: z.boolean(),
  did_emotional_release: z.boolean(),
  can_do_physical_activity: z.boolean(),
  wants_new_experiences: z.boolean(),
  consent: z.literal(true),
})

const FORBIDDEN_MESSAGE = 'ليست لديك صلاحية لتنفيذ هذا الإجراء.'

// Wraps admin_list_trip_applications() the same way
// src/lib/admin-session-attendees.ts wraps admin_list_session_attendees()
// - RLS alone can't serve this list (trip_applications has no admin SELECT-
// everyone-at-once convenience beyond row-by-row, and no UPDATE policy for
// admin at all by design), so every read of another member's application
// goes through this SECURITY DEFINER RPC instead of a direct table query.
export async function getTripApplications(
  supabase: SupabaseClient,
  tripId: string
): Promise<AdminTripApplicationRow[]> {
  const { data, error } = await supabase.rpc('admin_list_trip_applications', {
    p_trip_id: tripId,
  })

  if (error) {
    if (error.message === 'FORBIDDEN') throw new Error(FORBIDDEN_MESSAGE)
    throw error
  }

  // Not using .returns<T[]>() here: with an untyped SupabaseClient, rpc().
  // returns<T[]>() resolves to the wrong overload - see the same note in
  // src/lib/admin-session-attendees.ts.
  return (data ?? []) as AdminTripApplicationRow[]
}

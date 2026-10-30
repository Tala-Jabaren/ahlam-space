-- Admin "attendees" list for a single class session: every booking against
-- that session (including cancelled/expired), with the member's contact
-- details, for the admin-only /admin/classes/.../attendees page.
--
-- REVIEW AND RUN MANUALLY in the Supabase SQL editor. NOT run by Claude.
-- Written to be safely re-runnable (CREATE OR REPLACE, idempotent grants).
-- Read-only: no table, column, or policy is added or changed by this file.
--
-- Schema verified against src/types/database.ts and the live schema
-- comments in admin-customers.sql/admin-payments.sql before writing this:
--   bookings(id, session_id, user_id, status, payment_status, reference,
--            reserved_until, created_at, payment_method)
--   profiles(id, full_name, phone, city, role, created_at) - no email column
--   auth.users(id, email, ...) - Supabase's own table; a SECURITY DEFINER
--     function owned by a role with access to the auth schema (the normal
--     case for functions created via the Supabase SQL editor) can select
--     from it directly, same as admin_list_customers() already does. If
--     this raises a permission error for you, the function's owner needs
--     `grant usage on schema auth, select on auth.users` - a one-time
--     dashboard-side grant, not something this file can do for you.
--
-- bookings.user_id is not nullable - there is no guest-booking path for
-- classes (unlike orders), so every booking row has a real member behind
-- it. A plain join (not left join) to profiles/auth.users is therefore
-- safe and will never silently drop a row. profiles.full_name/phone are
-- themselves nullable, independent of the join - a member who never filled
-- those in still gets a row here, with null name/phone; the UI handles
-- that, not this function.
--
-- Returns ALL bookings for the session regardless of status (including
-- 'cancelled' and expired-but-never-confirmed holds) - filtering active vs.
-- cancelled/expired is a UI concern, not a data-access one, so the admin
-- can always see the full history for a session if she wants to.
--
-- Every column reference below is table-qualified (b./p./u.) on purpose:
-- several of the OUT parameter names below (status, payment_status,
-- created_at, reserved_until, user_id, full_name, phone) are identical to
-- real column names on bookings/profiles, and an unqualified reference
-- inside a plpgsql RETURN QUERY can silently resolve to the OUT parameter
-- instead of the table column - a real bug this project has already hit
-- once (see supabase/class-reminders.sql's claim_due_class_reminders fix).

begin;

create or replace function public.admin_list_session_attendees(p_session_id uuid)
returns table (
  booking_id uuid,
  reference text,
  status text,
  payment_status text,
  created_at timestamptz,
  reserved_until timestamptz,
  user_id uuid,
  full_name text,
  phone text,
  email text
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  return query
  select
    b.id as booking_id,
    b.reference,
    b.status,
    b.payment_status,
    b.created_at,
    b.reserved_until,
    b.user_id,
    p.full_name,
    p.phone,
    u.email::text as email
  from public.bookings as b
  join public.profiles as p on p.id = b.user_id
  join auth.users as u on u.id = b.user_id
  where b.session_id = p_session_id
  order by b.created_at;
end;
$$;

revoke all on function public.admin_list_session_attendees(uuid)
  from public, anon;
grant execute on function public.admin_list_session_attendees(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;

-- Test (as admin, via supabase.rpc('admin_list_session_attendees', { p_session_id: '<a real session id>' })):
--   one row per booking against that session, oldest first, status/
--   payment_status shown as-is (including any 'cancelled' rows), email
--   populated from auth.users, full_name/phone null for a member who never
--   filled in their profile rather than the row being dropped.
-- Test (a session with zero bookings): empty array, not an error.
-- Test (as a non-admin authenticated user): expect FORBIDDEN (errcode 42501).
-- Test (as anon, no session at all): expect FORBIDDEN - auth.uid() is null.
-- Test (p_session_id that doesn't exist): empty array, same as zero bookings
--   - this function doesn't validate the session itself exists, since the
--   admin page already has the session's own details from elsewhere and
--   only needs this for its bookings.

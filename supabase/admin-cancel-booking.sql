-- Lets an admin cancel an individual booking directly (paid, unpaid, or
-- package-funded), from the session attendees list or from الحصص >
-- الدفعات - the gap flagged and deliberately left unbuilt in
-- supabase/package-booking.sql (only the whole-session cancel existed).
--
-- REVIEW AND RUN MANUALLY in the Supabase SQL editor as postgres, AFTER
-- supabase/class-packages.sql and supabase/package-booking.sql (needs
-- bookings.package_purchase_id). Written to run once; re-running is safe
-- (every object uses IF NOT EXISTS / CREATE OR REPLACE / DROP ... IF EXISTS,
-- except admin_list_session_attendees, which is dropped-then-recreated
-- because Postgres won't let CREATE OR REPLACE change a function's
-- RETURNS TABLE column list - see section 2's own note).
--
-- Does NOT touch payments or refunds: cancelling a paid regular booking
-- here does not move any money or mark anything "refunded" - it only
-- records that a refund conversation may be owed (cancelled_at,
-- admin_cancel_note) so Ahlam can track it herself. The booking row is
-- always kept, never deleted, so that record persists.
--
-- REUSES (does not duplicate):
--   public.is_admin() - defined in admin-payments.sql section 2.
--   The same row-lock order as public.cancel_booking (booking row, then
--     its session row) and the same booked_count/package-credit-return
--     shape, including the same "don't return credit if the session is
--     already cancelled" guard (package-booking.sql section 4) - not
--     reinvented here.
--
-- =============================================================================
-- ROLLBACK (keep this up to date; run manually if this needs to be undone):
-- =============================================================================
--
-- begin;
-- revoke execute on function public.admin_cancel_booking(uuid, text) from authenticated;
-- drop function if exists public.admin_cancel_booking(uuid, text);
-- -- admin_list_session_attendees: restore the pre-this-file version by
-- -- re-running admin-session-attendees.sql's own "create or replace
-- -- function" block on its own (its RETURNS TABLE loses the three columns
-- -- this file added, so it must be dropped first there too).
-- alter table public.bookings drop column if exists cancelled_at;
-- alter table public.bookings drop column if exists admin_cancel_note;
-- notify pgrst, 'reload schema';
-- commit;
--
-- =============================================================================
-- PRE-FLIGHT (read-only - run these first and review the output):
-- =============================================================================
--
-- (a) Confirm package-booking.sql has already been run:
-- select column_name from information_schema.columns
-- where table_schema = 'public' and table_name = 'bookings' and column_name = 'package_purchase_id';
--
-- (b) Confirm the reused objects already exist:
-- select proname from pg_proc where proname in ('is_admin', 'cancel_booking', 'admin_list_session_attendees');
--
-- (c) Confirm bookings.cancelled_at / admin_cancel_note don't already exist
-- under a different definition (should return no rows on a first run):
-- select column_name from information_schema.columns
-- where table_schema = 'public' and table_name = 'bookings'
--   and column_name in ('cancelled_at', 'admin_cancel_note');

begin;

-- =============================================================================
-- 1. bookings.cancelled_at / bookings.admin_cancel_note
-- =============================================================================

alter table public.bookings
  add column if not exists cancelled_at timestamptz null,
  add column if not exists admin_cancel_note text null;

-- =============================================================================
-- 2. admin_cancel_booking(p_booking_id, p_note default null)
-- =============================================================================
--
-- Unlike cancel_booking (the member-facing RPC), this has no 12h window
-- and no "paid regular booking blocked" rule - an admin can cancel any
-- booking, any time, for any reason (p_note is hers to explain why/record
-- a refund conversation). Same lock order as cancel_booking (booking row
-- first, then its session row) so the two can never deadlock against each
-- other if ever called concurrently on the same booking/session.

create or replace function public.admin_cancel_booking(
  p_booking_id uuid,
  p_note text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session_id uuid;
  v_booking_status text;
  v_package_purchase_id uuid;
  v_session_status text;
  v_sessions_total integer;
begin
  if not coalesce(public.is_admin(), false) then
    raise exception 'FORBIDDEN';
  end if;

  select
    bookings.session_id,
    bookings.status,
    bookings.package_purchase_id
  into
    v_session_id,
    v_booking_status,
    v_package_purchase_id
  from public.bookings
  where bookings.id = p_booking_id
  for update;

  if not found then
    raise exception 'BOOKING_NOT_FOUND';
  end if;

  if v_booking_status = 'cancelled' then
    raise exception 'ALREADY_CANCELLED';
  end if;

  select class_sessions.status into v_session_status
  from public.class_sessions
  where class_sessions.id = v_session_id
  for update;

  update public.bookings
  set status = 'cancelled',
      cancelled_at = now(),
      -- Keeps the note from growing unbounded through this column -
      -- plenty of room for a real explanation, not a place to paste a
      -- payment thread.
      admin_cancel_note = left(p_note, 500)
  where id = p_booking_id;

  update public.class_sessions
  set booked_count = greatest(booked_count - 1, 0)
  where id = v_session_id;

  -- Also skip the return if the session itself is already cancelled -
  -- return_package_credits_for_session (package-booking.sql section 5)
  -- already returned this exact credit when the admin cancelled the whole
  -- session; without this check, cancelling one more booking on an
  -- already-cancelled session (its row was left untouched by that earlier
  -- whole-session cancel, by design) would mint a second credit for it.
  if v_package_purchase_id is not null and v_session_status <> 'cancelled' then
    -- Same credit-return shape as cancel_booking (package-booking.sql
    -- section 4): capped at sessions_total.
    select sessions_total into v_sessions_total
    from public.package_purchases
    where id = v_package_purchase_id
    for update;

    update public.package_purchases
    set sessions_remaining = least(sessions_remaining + 1, v_sessions_total)
    where id = v_package_purchase_id;
  end if;

  return true;
end;
$$;

revoke all on function public.admin_cancel_booking(uuid, text) from public, anon;
grant execute on function public.admin_cancel_booking(uuid, text) to authenticated;
-- Test (as admin, any active booking - paid regular, unpaid regular, or
--   package, at any time before or after the session): expect true,
--   booking -> 'cancelled', cancelled_at set, admin_cancel_note stored
--   (or null if omitted, truncated to 500 chars if longer), booked_count
--   -1; if package, that purchase's sessions_remaining +1 (capped at
--   sessions_total).
-- Test (same booking, cancel it again): expect ALREADY_CANCELLED, nothing
--   changes a second time.
-- Test (a booking id that doesn't exist): expect BOOKING_NOT_FOUND.
-- Test (as a non-admin authenticated user): expect FORBIDDEN.
-- Test (a paid regular booking specifically): expect success here even
--   though cancel_booking (the member-facing RPC) would have raised
--   PAID_BOOKING_CONTACT_ADMIN for the same booking - confirms the two
--   functions are intentionally independent, not one calling the other.
-- Test (admin cancels the whole session first, then cancels one of its
--   package bookings individually here): expect true, that booking ->
--   'cancelled', booked_count -1 again - but sessions_remaining must NOT
--   increment a second time, since the whole-session cancel's trigger
--   already returned that credit.

-- =============================================================================
-- 3. admin_list_session_attendees: surface package/cancel info to the UI
-- =============================================================================
--
-- Adds package_purchase_id (so the admin UI's cancel-confirmation dialog
-- can tell a package booking from a regular one) and cancelled_at /
-- admin_cancel_note (so an already-cancelled row can show them). Postgres
-- does not allow CREATE OR REPLACE to change a RETURNS TABLE column list,
-- so this function must be dropped first - everything else about it
-- (the FORBIDDEN check, the join shape, column-qualifying every
-- reference) is unchanged from admin-session-attendees.sql.

drop function if exists public.admin_list_session_attendees(uuid);

create function public.admin_list_session_attendees(p_session_id uuid)
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
  email text,
  package_purchase_id uuid,
  cancelled_at timestamptz,
  admin_cancel_note text
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
    u.email::text as email,
    b.package_purchase_id,
    b.cancelled_at,
    b.admin_cancel_note
  from public.bookings as b
  left join public.profiles as p on p.id = b.user_id
  join auth.users as u on u.id = b.user_id
  where b.session_id = p_session_id
  order by b.created_at;
end;
$$;

revoke all on function public.admin_list_session_attendees(uuid)
  from public, anon;
grant execute on function public.admin_list_session_attendees(uuid) to authenticated;
-- Test (as admin, via supabase.rpc('admin_list_session_attendees', { p_session_id: '<a real session id>' })):
--   expect the same rows as before plus package_purchase_id/cancelled_at/
--   admin_cancel_note on each, non-null on exactly the bookings they apply to.

-- Make all of the above visible to PostgREST immediately.
notify pgrst, 'reload schema';

commit;

-- =============================================================================
-- UI reference (for the app code in this PR):
-- =============================================================================
--
-- supabase.rpc('admin_cancel_booking', { p_booking_id: uuid, p_note?: string })
--   -> returns true, or throws one of: FORBIDDEN, BOOKING_NOT_FOUND,
--      ALREADY_CANCELLED. Called from the new, shared
--      src/components/admin/admin-cancel-booking-button.tsx, used in the
--      session attendees list (.../attendees/attendees-client.tsx) and in
--      الحصص > الدفعات (domain-payments.tsx's booking rows only).
-- admin_list_session_attendees's three new output columns drive: the
--   cancel dialog's package-vs-regular wording (package_purchase_id), and
--   the "ملغي · مدفوع" chip for an already-cancelled, already-paid booking
--   (derived from status + payment_status - cancelled_at/admin_cancel_note
--   aren't shown in the UI yet, just exposed for a future "why was this
--   cancelled" view).

-- Package-funded bookings (Stage 1, phase 2 of class-packages): lets a
-- member book an eligible class session using a package's credit instead
-- of paying per session, and makes sure that credit comes back correctly
-- on cancellation - by the member herself (more than 12h before the
-- session) or by an admin cancelling the whole session.
--
-- ONE 12-HOUR CANCELLATION RULE FOR EVERY BOOKING, PAID REGULAR BOOKINGS
-- EXCLUDED ENTIRELY: an earlier version of this file gave package
-- bookings a 12h cutoff while leaving the existing cancel_booking's 24h
-- cutoff for everything else, flagging that mismatch for a human
-- decision. That decision is now made - every unpaid regular or package
-- booking is cancellable only while its session starts more than 12 hours
-- from now (the 24h branch is gone). A PAID regular booking can never be
-- self-cancelled at all, not even outside the 12h window - she has to
-- contact Ahlam. Package bookings are never affected by that last rule:
-- they're always already paid by construction (the "payment" is the
-- package credit spent at booking time), so they always just follow the
-- plain 12h rule.
--
-- REVIEW AND RUN MANUALLY in the Supabase SQL editor as postgres, AFTER
-- supabase/class-packages.sql. Written to run once; re-running is safe
-- (every object uses IF NOT EXISTS / CREATE OR REPLACE / DROP ... IF EXISTS).
--
-- Do NOT set PACKAGES_ENABLED until this has been run and reviewed live -
-- the package-specific parts of this file (book_class_session_with_package,
-- the credit-return trigger, the package branch inside cancel_booking)
-- stay unreachable until then. cancel_booking's unified 12h rule, however,
-- applies to EVERY booking the moment this file is run, regardless of
-- PACKAGES_ENABLED - the app's cancel UI is no longer behind any flag
-- (the old CANCEL_ENABLED=false stub is gone from the app code).
--
-- REUSES (does not duplicate):
--   public.expire_stale_bookings_for_session(uuid) - defined in
--     admin-payments.sql section 8, called here exactly as
--     book_class_session already calls it, so a package booking releases
--     the same lapsed bank-transfer holds before capacity is checked.
--   The capacity/booked_count update shape from book_class_session
--     (admin-payments.sql section 8): "update class_sessions set
--     booked_count = booked_count + 1 where id = ... and booked_count <
--     capacity and status = 'scheduled'" - copied verbatim below, not
--     reinvented, so both booking paths can never disagree on what
--     "full" means.
--   public.cancel_booking(uuid, uuid)'s existing lock-then-check-then-
--     update structure (admin-payments.sql section 10) - redefined below
--     with the cutoff unified to 12h and one added branch for package
--     credit, rather than a second, parallel cancel function.
--   src/lib/class-cards.ts's canCancelSession/TWELVE_HOURS - the one
--     shared 12h constant the app's cancel UI reads everywhere a booking
--     is shown (/classes, /member-schedule, /bookings).
--
-- OUT OF SCOPE (not built here, confirmed by re-reading the task): refunds
-- and transfers of package purchases.
--
-- =============================================================================
-- ROLLBACK (keep this up to date; run manually if this needs to be undone -
-- safe to run even if only part of the file below was applied):
-- =============================================================================
--
-- begin;
-- revoke execute on function public.book_class_session_with_package(uuid, uuid) from authenticated;
-- drop function if exists public.book_class_session_with_package(uuid, uuid);
-- drop trigger if exists return_package_credits_on_session_cancel on public.class_sessions;
-- drop function if exists public.return_package_credits_for_session(uuid);
-- alter table public.bookings drop column if exists package_purchase_id;
-- -- bookings_payment_method_check: restore the 3-value version:
-- alter table public.bookings drop constraint if exists bookings_payment_method_check;
-- alter table public.bookings add constraint bookings_payment_method_check
--   check (payment_method in ('card_gateway', 'bank_transfer', 'cash_at_studio'));
-- -- cancel_booking: restore the pre-this-file version from admin-payments.sql
-- -- section 10 by re-running that file's "create or replace function
-- -- public.cancel_booking(...)" block on its own.
-- notify pgrst, 'reload schema';
-- commit;
--
-- =============================================================================
-- PRE-FLIGHT (read-only - run these first and review the output):
-- =============================================================================
--
-- (a) Confirm class-packages.sql has already been run (if this returns no
-- rows, stop and run that file first):
-- select table_name from information_schema.tables
-- where table_schema = 'public' and table_name in ('class_packages', 'package_purchases');
--
-- (b) Confirm the reused functions already exist:
-- select proname from pg_proc
-- where proname in ('expire_stale_bookings_for_session', 'cancel_booking', 'is_admin');
--
-- (c) Confirm bookings.package_purchase_id doesn't already exist under a
-- different definition (should return no rows on a first run):
-- select column_name from information_schema.columns
-- where table_schema = 'public' and table_name = 'bookings' and column_name = 'package_purchase_id';
--
-- (d) Print the live payment_method constraint before widening it in
-- section 2 below - confirm it's the 3-value version this file expects:
-- select pg_get_constraintdef(oid) from pg_constraint
-- where conname = 'bookings_payment_method_check';

begin;

-- =============================================================================
-- 1. bookings.package_purchase_id
-- =============================================================================

alter table public.bookings
  add column if not exists package_purchase_id uuid null references public.package_purchases(id);

-- =============================================================================
-- 2. bookings.payment_method - widen the CHECK constraint to allow 'package'
-- =============================================================================
--
-- The live constraint (confirmed via pre-flight query (d) above) is
-- bookings_payment_method_check, allowing only 'card_gateway',
-- 'bank_transfer', 'cash_at_studio'. Section 3 below inserts
-- payment_method = 'package', which would violate it as written - this
-- must run before that function exists so its very first real insert
-- doesn't fail. bookings_status_check and bookings_payment_status_check
-- are untouched - the values this file uses ('confirmed'/'paid') are
-- already allowed by both.

alter table public.bookings
  drop constraint if exists bookings_payment_method_check;
alter table public.bookings
  add constraint bookings_payment_method_check
  check (payment_method in ('card_gateway', 'bank_transfer', 'cash_at_studio', 'package'));

-- =============================================================================
-- 3. book_class_session_with_package(p_session_id, p_user_id)
-- =============================================================================
--
-- Mirrors book_class_session's own structure (lock the session, release
-- stale holds, re-check capacity under lock, increment booked_count with
-- the exact same WHERE guard) but spends a package credit instead of
-- opening a 24h bank-transfer hold: the booking is inserted already
-- confirmed/paid, with payment_method = 'package' and package_purchase_id
-- set, so it never shows up as "awaiting payment" anywhere admin payments
-- already look.
--
-- Picks the member's own paid, not-yet-exhausted, not-yet-expired
-- purchase with the SOONEST expiry first (same "use the one closest to
-- lapsing" ordering as src/lib/package-purchases.ts's pickActive on the
-- app side), so credit from a package about to expire is used before one
-- with more runway.

create or replace function public.book_class_session_with_package(
  p_session_id uuid,
  p_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_booking_id uuid;
  v_class_id uuid;
  v_session_date date;
  v_start_time time;
  v_session_start timestamptz;
  v_package_eligible boolean;
  v_purchase_id uuid;
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'FORBIDDEN';
  end if;

  perform 1 from public.class_sessions where id = p_session_id for update;

  -- Same opportunistic cleanup book_class_session does before counting
  -- capacity - a lapsed bank-transfer hold on this session shouldn't block
  -- a package booking either.
  perform public.expire_stale_bookings_for_session(p_session_id);

  select class_id, session_date, start_time into v_class_id, v_session_date, v_start_time
  from public.class_sessions
  where id = p_session_id;

  if not found then
    raise exception 'SESSION_FULL';
  end if;

  v_session_start := (v_session_date + v_start_time) at time zone 'Asia/Jerusalem';
  if v_session_start <= now() then
    raise exception 'SESSION_STARTED';
  end if;

  select package_eligible into v_package_eligible
  from public.classes
  where id = v_class_id;

  if v_package_eligible is distinct from true then
    raise exception 'NOT_PACKAGE_ELIGIBLE';
  end if;

  if exists (
    select 1 from public.bookings
    where session_id = p_session_id
      and user_id = p_user_id
      and status <> 'cancelled'
  ) then
    raise exception 'ALREADY_BOOKED';
  end if;

  select id into v_purchase_id
  from public.package_purchases
  where user_id = p_user_id
    and status = 'paid'
    and sessions_remaining > 0
    and (expires_at is null or expires_at > now())
  order by expires_at nulls last
  for update
  limit 1;

  if not found then
    raise exception 'NO_PACKAGE_CREDIT';
  end if;

  -- Identical guard to book_class_session's own capacity update - "full"
  -- means the same thing on both booking paths.
  update public.class_sessions
    set booked_count = booked_count + 1
    where id = p_session_id
      and booked_count < capacity
      and status = 'scheduled';

  if not found then
    raise exception 'SESSION_FULL';
  end if;

  update public.package_purchases
    set sessions_remaining = sessions_remaining - 1
    where id = v_purchase_id;

  insert into public.bookings (
    session_id, user_id, status, payment_status, payment_method, paid_at, package_purchase_id
  )
  values (
    p_session_id, p_user_id, 'confirmed', 'paid', 'package', now(), v_purchase_id
  )
  returning id into v_booking_id;

  return v_booking_id;
end;
$$;

revoke all on function public.book_class_session_with_package(uuid, uuid) from public, anon;
grant execute on function public.book_class_session_with_package(uuid, uuid) to authenticated;
-- Test (eligible class, session not full, caller has an active package
--   with remaining > 0): expect success; booking row has status =
--   'confirmed', payment_status = 'paid', package_purchase_id set;
--   class_sessions.booked_count +1; package_purchases.sessions_remaining -1.
-- Test (same caller, same session, called again): expect ALREADY_BOOKED.
-- Test (class.package_eligible = false, e.g. the Mix class): expect
--   NOT_PACKAGE_ELIGIBLE, regardless of whether the caller has credit.
-- Test (caller has no paid purchase, or all are at 0 remaining, or all are
--   expired): expect NO_PACKAGE_CREDIT.
-- Test (session already at capacity): expect SESSION_FULL, and verify
--   sessions_remaining / booked_count are both left unchanged (the
--   capacity update must run - and fail - before the credit is spent).
-- Test (caller has two active purchases, one expiring sooner): expect the
--   sooner-expiring one's sessions_remaining to be the one decremented.
-- Test (session already started, or already finished): expect
--   SESSION_STARTED - checked before capacity/eligibility/credit, so none
--   of those are touched.
-- Test (p_user_id not the caller's own id): expect FORBIDDEN.

-- =============================================================================
-- 4. cancel_booking(p_booking_id, p_user_id) - one 12h rule, paid regular
--    bookings excluded entirely
-- =============================================================================
--
-- Same FORBIDDEN check, same row locks, same idempotency via the captured
-- pre-update status as the existing function (admin-payments.sql section
-- 10) - changes are the cutoff (12h, not 24h, for every booking), a new
-- up-front block on self-cancelling a PAID regular booking, and reading
-- bookings.package_purchase_id to return credit when it's set. Credit is
-- only ever returned inside the existing "v_booking_status <> 'cancelled'"
-- guard AND a second guard reading class_sessions.status - the booking's
-- own status never changes when an admin cancels the whole session (see
-- section 5 below), so the booking-status guard alone can't tell "this
-- credit was already returned by the trigger" from "this credit was never
-- returned". Together, a repeated cancel - whether called twice directly,
-- or once by an admin session-cancel and once by the member herself -
-- can never mint credit twice.
--
-- Checked which column actually means "paid" before writing this (same
-- pattern reviews.sql's admin_delete_record already uses for the same
-- question on this same table): bookings.status tracks the booking's own
-- lifecycle (pending/confirmed/cancelled - set by book_class_session on
-- insert and admin_confirm_payment on confirm), bookings.payment_status
-- is the actual payment flag (defaults unpaid, admin_confirm_payment sets
-- it to 'paid' alongside paid_at). "Paid" below means payment_status =
-- 'paid' OR paid_at is not null, matching reviews.sql's own defensive
-- either/or rather than trusting a single column.
--
-- Package bookings are exempt from this block entirely: they're created
-- already payment_status = 'paid' (book_class_session_with_package, part
-- 3 above) since "payment" is the package credit spent at booking time,
-- not a separate pending charge - they always follow the plain 12h rule.

create or replace function public.cancel_booking(
  p_booking_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session_id uuid;
  v_booking_status text;
  v_payment_status text;
  v_paid_at timestamptz;
  v_package_purchase_id uuid;
  v_session_date date;
  v_start_time time;
  v_session_status text;
  v_session_start timestamptz;
  v_sessions_total integer;
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'FORBIDDEN';
  end if;

  select
    bookings.session_id,
    bookings.status,
    bookings.payment_status,
    bookings.paid_at,
    bookings.package_purchase_id
  into
    v_session_id,
    v_booking_status,
    v_payment_status,
    v_paid_at,
    v_package_purchase_id
  from public.bookings
  where bookings.id = p_booking_id
    and bookings.user_id = p_user_id
  for update;

  if not found then
    raise exception 'NOT_YOUR_BOOKING';
  end if;

  -- Before anything else changes: a paid regular booking can never be
  -- self-cancelled, full stop - not "12h or less", not at all.
  if v_package_purchase_id is null
    and (v_payment_status = 'paid' or v_paid_at is not null)
  then
    raise exception 'PAID_BOOKING_CONTACT_ADMIN';
  end if;

  select
    class_sessions.session_date,
    class_sessions.start_time,
    class_sessions.status
  into
    v_session_date,
    v_start_time,
    v_session_status
  from public.class_sessions
  where class_sessions.id = v_session_id
  for update;

  if not found then
    raise exception 'SESSION_NOT_FOUND';
  end if;

  v_session_start := (v_session_date + v_start_time) at time zone 'Asia/Jerusalem';

  -- Remaining case (unpaid regular, or package - both still reachable
  -- here): cancellable only while the session starts more than 12 hours
  -- from now.
  if v_session_start <= now() + interval '12 hours' then
    raise exception 'CANCELLATION_WINDOW_PASSED';
  end if;

  update public.bookings
  set status = 'cancelled'
  where id = p_booking_id;

  if v_booking_status <> 'cancelled' then
    update public.class_sessions
    set booked_count = greatest(booked_count - 1, 0)
    where id = v_session_id;

    -- Also skip the return if the SESSION itself is already cancelled -
    -- return_package_credits_for_session (section 5 below) already
    -- returned this exact credit when the admin cancelled the whole
    -- session; the booking row's own status never got touched by that
    -- (by design), so without this check this branch would mint a second
    -- credit for the same booking on the member's own later cancel.
    if v_package_purchase_id is not null and v_session_status <> 'cancelled' then
      -- Credit goes back even if the purchase has since expired - it's
      -- simply unusable from then on (no extension), per spec.
      select sessions_total into v_sessions_total
      from public.package_purchases
      where id = v_package_purchase_id
      for update;

      update public.package_purchases
      set sessions_remaining = least(sessions_remaining + 1, v_sessions_total)
      where id = v_package_purchase_id;
    end if;
  end if;

  return true;
end;
$$;

revoke all on function public.cancel_booking(uuid, uuid) from public, anon;
grant execute on function public.cancel_booking(uuid, uuid) to authenticated;
-- Test (paid regular booking, payment_status = 'paid' or paid_at set, any
--   time before the session): expect PAID_BOOKING_CONTACT_ADMIN, nothing
--   changes - not even checked against the 12h window.
-- Test (unpaid regular booking, session more than 12h away): expect true,
--   booking -> 'cancelled', booked_count -1.
-- Test (package booking - always payment_status = 'paid' by construction -
--   session more than 12h away): expect true, booking -> 'cancelled',
--   booked_count -1, that purchase's sessions_remaining +1 (capped at
--   sessions_total). Confirms the paid-block above does NOT apply to it.
-- Test (unpaid regular or package booking, session 12h away or less):
--   expect CANCELLATION_WINDOW_PASSED, nothing changes.
-- Test (package booking whose purchase has since expired, session still
--   more than 12h away): expect true and sessions_remaining +1 same as
--   above - the credit is NOT usable afterward since expires_at has
--   already passed, this RPC doesn't change that.
-- Test (same booking, cancel it twice): expect true both times, but
--   booked_count/sessions_remaining must NOT change a second time (status
--   was already 'cancelled' going into the second call).
-- Test (admin cancels the whole session, then the member cancels her
--   package booking on it herself): expect true, her booking ->
--   'cancelled', booked_count -1 again (admin's own session cancel never
--   touches booked_count) - but sessions_remaining must NOT increment a
--   second time, since return_package_credits_for_session already
--   returned that credit when the session was cancelled.
-- Test (someone else's booking id): expect NOT_YOUR_BOOKING.
-- Test (p_user_id not the caller's own id): expect FORBIDDEN.

-- =============================================================================
-- 5. Admin cancelling a whole session returns package credit too
-- =============================================================================
--
-- The admin "cancel this session" action (src/components/admin/session-
-- controls.tsx) is a direct client-side `.update({ status: 'cancelled' })`
-- on class_sessions - there is no RPC to extend, and it deliberately
-- leaves bookings rows untouched ("ستبقى الحجوزات محفوظة للتواصل مع
-- أصحابها" - kept so Ahlam can contact their owners). A trigger is the
-- only way to hook "credit comes back" into that existing flow without
-- changing its code or its booking-rows-stay-put behavior.

create or replace function public.return_package_credits_for_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.package_purchases
  set sessions_remaining = least(
    package_purchases.sessions_remaining + 1,
    package_purchases.sessions_total
  )
  from public.bookings
  where bookings.session_id = p_session_id
    and bookings.package_purchase_id = package_purchases.id
    and bookings.status <> 'cancelled';
end;
$$;

revoke all on function public.return_package_credits_for_session(uuid) from public, anon, authenticated;

create or replace function public.return_package_credits_on_session_cancel()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    perform public.return_package_credits_for_session(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists return_package_credits_on_session_cancel on public.class_sessions;
create trigger return_package_credits_on_session_cancel
  after update of status on public.class_sessions
  for each row
  execute function public.return_package_credits_on_session_cancel();
-- Test (as admin, cancel a session that has a confirmed package booking on
--   it, via the normal admin UI): expect that purchase's sessions_remaining
--   to go up by 1 (capped at sessions_total), and the booking row itself
--   left completely unchanged (still 'confirmed', not touched) - matching
--   the existing admin cancel-session behavior of leaving bookings as a
--   historical/contact record.
-- Test (cancel that same session again, e.g. re-saving with status already
--   'cancelled'): expect no further increment (the trigger's own "old.status
--   is distinct from 'cancelled'" guard, not just this function's internal
--   WHERE clause, is what prevents a double-return here).
-- Test (cancel a session with no package bookings on it): expect no error,
--   no rows updated.

-- Make all of the above visible to PostgREST immediately.
notify pgrst, 'reload schema';

commit;

-- =============================================================================
-- UI reference (for the app code in this PR):
-- =============================================================================
--
-- supabase.rpc('book_class_session_with_package', { p_session_id: uuid, p_user_id: uuid })
--   -> returns the new booking's id, or throws one of: FORBIDDEN,
--      SESSION_FULL, ALREADY_BOOKED, NOT_PACKAGE_ELIGIBLE, NO_PACKAGE_CREDIT.
--   Reachable only once PACKAGES_ENABLED is on.
--
-- cancel_booking's call shape is unchanged - supabase.rpc('cancel_booking',
--   { p_booking_id: uuid, p_user_id: uuid }) -> returns true, or throws one
--   of: FORBIDDEN, NOT_YOUR_BOOKING, SESSION_NOT_FOUND,
--   PAID_BOOKING_CONTACT_ADMIN (regular booking, already paid - no cancel
--   button shown for this case at all, but the client still handles it as
--   a race, see below), CANCELLATION_WINDOW_PASSED. Package vs non-package
--   and paid vs unpaid are both decided server-side from the booking row
--   itself, nothing new for the client to pass in. Called from the new,
--   shared src/components/classes/booking-cancel-control.tsx, used
--   everywhere a member's own booking is shown (/classes,
--   /member-schedule, /bookings) - this is now a live feature regardless
--   of PACKAGES_ENABLED; the old CANCEL_ENABLED=false stub and its
--   NOT_IMPLEMENTED-only server action are both deleted.

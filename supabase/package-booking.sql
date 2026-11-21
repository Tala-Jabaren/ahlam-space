-- Package-funded bookings (Stage 1, phase 2 of class-packages): lets a
-- member book an eligible class session using a package's credit instead
-- of paying per session, and makes sure that credit comes back correctly
-- on cancellation - by the member herself (>=12h before the session) or
-- by an admin cancelling the whole session.
--
-- REVIEW AND RUN MANUALLY in the Supabase SQL editor as postgres, AFTER
-- supabase/class-packages.sql. Written to run once; re-running is safe
-- (every object uses IF NOT EXISTS / CREATE OR REPLACE / DROP ... IF EXISTS).
--
-- Do NOT set PACKAGES_ENABLED, and do not wire CANCEL_ENABLED, until this
-- has been run and reviewed live. The app code gated behind either flag
-- does not touch anything in this file while both stay off.
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
--     with one added branch for package bookings (12h + credit return)
--     rather than a second, parallel cancel function. Non-package
--     bookings keep its existing 24h rule and behavior completely
--     unchanged; only the new branch is new code.
--   src/lib/class-cards.ts's own 12-hour cutoff (canCancelSession /
--     TWELVE_HOURS) - already what the frontend copy and the disabled
--     CANCEL_ENABLED stub (src/app/(public)/classes/cancel-booking.ts)
--     both assume ("recheck >12h on the server"). Note: this is
--     DIFFERENT from cancel_booking's own existing 24h window for
--     non-package bookings - that mismatch between the 24h already in
--     cancel_booking and the 12h the frontend/stub were written for
--     predates this file and isn't changed here; flagged in the PR notes
--     for a human decision, not silently "fixed" as a side effect of this
--     unrelated feature.
--
-- OUT OF SCOPE (not built here, confirmed by re-reading the task): refunds
-- and transfers of package purchases, and any UI wiring of CANCEL_ENABLED
-- itself (that stays false; this file only makes the RPC it will
-- eventually call behave correctly once it's turned on).
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

begin;

-- =============================================================================
-- 1. bookings.package_purchase_id
-- =============================================================================

alter table public.bookings
  add column if not exists package_purchase_id uuid null references public.package_purchases(id);

-- =============================================================================
-- 2. book_class_session_with_package(p_session_id, p_user_id)
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

  select class_id into v_class_id
  from public.class_sessions
  where id = p_session_id;

  if not found then
    raise exception 'SESSION_FULL';
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
-- Test (p_user_id not the caller's own id): expect FORBIDDEN.

-- =============================================================================
-- 3. cancel_booking(p_booking_id, p_user_id) - add the package branch
-- =============================================================================
--
-- Everything above the new "if v_package_purchase_id is not null" branch
-- is byte-for-byte the existing function from admin-payments.sql section
-- 10 (same FORBIDDEN check, same row locks, same idempotency via the
-- captured pre-update status) - only now it also reads
-- bookings.package_purchase_id, and branches on it.

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
  v_package_purchase_id uuid;
  v_session_date date;
  v_start_time time;
  v_session_start timestamptz;
  v_sessions_total integer;
begin
  if p_user_id is distinct from auth.uid() then
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
    and bookings.user_id = p_user_id
  for update;

  if not found then
    raise exception 'NOT_YOUR_BOOKING';
  end if;

  select
    class_sessions.session_date,
    class_sessions.start_time
  into
    v_session_date,
    v_start_time
  from public.class_sessions
  where class_sessions.id = v_session_id
  for update;

  if not found then
    raise exception 'SESSION_NOT_FOUND';
  end if;

  v_session_start := (v_session_date + v_start_time) at time zone 'Asia/Jerusalem';

  if v_package_purchase_id is not null then
    -- Package bookings: 12h cutoff (matches src/lib/class-cards.ts's
    -- TWELVE_HOURS and the cancel-booking.ts stub's own comment), not the
    -- 24h cutoff below - intentionally different thresholds, see this
    -- file's header note.
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

    return true;
  end if;

  -- Non-package bookings: existing 24h rule, unchanged.
  if v_session_start <= now() + interval '24 hours' then
    raise exception 'CANCELLATION_WINDOW_PASSED';
  end if;

  update public.bookings
  set status = 'cancelled'
  where id = p_booking_id;

  if v_booking_status <> 'cancelled' then
    update public.class_sessions
    set booked_count = greatest(booked_count - 1, 0)
    where id = v_session_id;
  end if;

  return true;
end;
$$;

revoke all on function public.cancel_booking(uuid, uuid) from public, anon;
grant execute on function public.cancel_booking(uuid, uuid) to authenticated;
-- Test (package booking, session >=12h away): expect true, booking ->
--   'cancelled', booked_count -1, that purchase's sessions_remaining +1
--   (capped at sessions_total).
-- Test (package booking, session <12h away): expect
--   CANCELLATION_WINDOW_PASSED, nothing changes.
-- Test (package booking whose purchase has since expired, session still
--   >=12h away): expect true and sessions_remaining +1 same as above - the
--   credit is NOT usable afterward since expires_at has already passed,
--   this RPC doesn't change that.
-- Test (same package booking, cancel it twice): expect true both times,
--   but sessions_remaining must NOT be incremented a second time (status
--   was already 'cancelled' going into the second call).
-- Test (non-package booking, session >=24h / <24h away): unchanged from
--   before this file - expect true / CANCELLATION_WINDOW_PASSED respectively.
-- Test (someone else's booking id): expect NOT_YOUR_BOOKING.

-- =============================================================================
-- 4. Admin cancelling a whole session returns package credit too
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
-- UI reference (for the app code in the companion PR, once this file has
-- been run and PACKAGES_ENABLED is on):
-- =============================================================================
--
-- supabase.rpc('book_class_session_with_package', { p_session_id: uuid, p_user_id: uuid })
--   -> returns the new booking's id, or throws one of: FORBIDDEN,
--      SESSION_FULL, ALREADY_BOOKED, NOT_PACKAGE_ELIGIBLE, NO_PACKAGE_CREDIT.
--
-- cancel_booking's call shape is unchanged - supabase.rpc('cancel_booking',
--   { p_booking_id: uuid, p_user_id: uuid }) - package vs non-package is
--   decided server-side from the booking row itself, nothing new for the
--   client to pass in.

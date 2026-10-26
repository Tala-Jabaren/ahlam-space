-- Class reminders (members, 24h before their session) and an admin
-- notification queue (owner, on new bookings/orders/session requests/course
-- purchases) - the SQL side of feature/class-reminders.
--
-- REVIEW AND RUN MANUALLY in the Supabase SQL editor. NOT run by Claude.
-- Written to be safely re-runnable (CREATE OR REPLACE, IF NOT EXISTS,
-- idempotent triggers/grants).
--
-- Two functions beyond what was asked for: count_due_class_reminders() and
-- count_pending_admin_notifications(), both read-only. Added because the
-- ?dry=1 mode on both cron routes needs to report a count without claiming
-- anything, and the claim_* functions can't do that - for them, selecting
-- the due rows IS the same statement as claiming them.
--
-- Schema used here, verified against src/types/database.ts and the live
-- schema comments at the top of admin-payments.sql/admin-customers.sql:
--   bookings(id, session_id, user_id, status, payment_status, reference,
--            reserved_until, created_at, payment_method)
--   class_sessions(id, class_id, session_date, start_time, end_time,
--                   capacity, booked_count, status, location, created_at)
--   classes(id, name, ...)
--   orders(id, user_id [nullable], status, total, fulfillment_method,
--          reference, created_at, payment_method, delivery_address,
--          guest_name, guest_phone, guest_email)
--   session_requests(id, session_type, full_name, phone, email, message,
--                     status, created_at)
--   course_purchases(id, course_id, user_id, status, paid_at, reference,
--                     created_at)
--
-- Security model for every function in this file: NONE of them are meant
-- to be called by an authenticated user (admin or not) through the client
-- - they're cron-job-only, invoked with the service role key from
-- src/app/api/cron/*. So unlike admin_* functions elsewhere, these don't
-- check is_admin() at all; the guard is entirely in the grants at the
-- bottom of each section ("revoke all ... grant execute ... to
-- service_role"), which make them uncallable through PostgREST for every
-- other role, authenticated admins included. If a function here ever
-- needs to also be callable by an admin through the client, it should
-- gain the same "if auth.uid() is null or not coalesce(public.is_admin(),
-- false) then raise ... '42501' ... FORBIDDEN" guard used elsewhere in
-- this project - none of them need it today.

begin;

-- =============================================================================
-- 1. bookings.reminder_sent_at
-- =============================================================================

alter table public.bookings
  add column if not exists reminder_sent_at timestamptz;

-- =============================================================================
-- 2. claim_due_class_reminders(p_hours default 24)
-- =============================================================================
--
-- One atomic statement (a WITH chain: a locking CTE, an UPDATE CTE off of
-- it, then a plain SELECT that joins back in the read-only columns) - locks
-- and claims every confirmed, paid booking whose reminder hasn't been sent
-- yet and whose session starts in the future but within p_hours, in one
-- pass. "Claiming" means reminder_sent_at is set to now() as part of the
-- same statement that selects the rows, so two overlapping cron runs (or a
-- cron run overlapping a manual retry) can never both pick up the same
-- booking. FOR UPDATE SKIP LOCKED on the first CTE means a booking already
-- locked by something else (e.g. a customer cancelling it right now) is
-- silently skipped this run rather than waited on - it'll be picked up on a
-- later run if it's still due then.
--
-- This is a WITH chain rather than a single UPDATE ... FROM ... JOIN
-- because Postgres does not allow the UPDATE target table (bookings, as b)
-- to be referenced inside a JOIN ... ON within the UPDATE's own FROM
-- clause - `from due join class_sessions cs on cs.id = b.session_id` fails
-- at runtime ("invalid reference to FROM-clause entry for table b"), since
-- b is only in scope for the top-level WHERE/SET correlation, not inside a
-- join nested in the FROM list. Splitting the UPDATE into its own CTE
-- (returning only bookings columns) and joining class_sessions/classes in a
-- separate, final SELECT avoids the problem entirely.
create or replace function public.claim_due_class_reminders(p_hours integer default 24)
returns table (
  booking_id uuid,
  user_id uuid,
  reference text,
  class_name text,
  session_date date,
  start_time time,
  end_time time,
  location text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  with due as (
    select b.id
    from public.bookings as b
    join public.class_sessions as cs on cs.id = b.session_id
    where b.status = 'confirmed'
      and b.payment_status = 'paid'
      and b.reminder_sent_at is null
      and cs.status = 'scheduled'
      and (cs.session_date + cs.start_time) at time zone 'Asia/Jerusalem' > now()
      and (cs.session_date + cs.start_time) at time zone 'Asia/Jerusalem'
          <= now() + make_interval(hours => p_hours)
    for update of b skip locked
  ),
  upd as (
    update public.bookings as b
    set reminder_sent_at = now()
    from due as d
    where b.id = d.id
    returning b.id, b.user_id, b.reference, b.session_id
  )
  select
    upd.id as booking_id,
    upd.user_id,
    upd.reference,
    c.name as class_name,
    cs.session_date,
    cs.start_time,
    cs.end_time,
    cs.location
  from upd
  join public.class_sessions as cs on cs.id = upd.session_id
  join public.classes as c on c.id = cs.class_id;
end;
$$;

revoke all on function public.claim_due_class_reminders(integer)
  from public, anon, authenticated;
grant execute on function public.claim_due_class_reminders(integer) to service_role;
-- Test (as service_role, with a confirmed+paid test booking whose session is
--   18h from now): one row returned, that booking's reminder_sent_at now set.
--   Call it again immediately: that booking is NOT returned a second time
--   (reminder_sent_at is no longer null).
-- Test (same booking, but reminder_sent_at manually reset to null and the
--   session moved to 48h from now, outside the default 24h window): not
--   returned by claim_due_class_reminders() with no argument; IS returned by
--   claim_due_class_reminders(72).
-- Test (a confirmed+paid booking whose session has already started/passed):
--   never returned, regardless of reminder_sent_at.

-- Read-only companion, NOT asked for explicitly but needed to satisfy the
-- GET /api/cron/class-reminders?dry=1 requirement ("claims nothing and
-- returns counts only") - claim_due_class_reminders() can't be used for a
-- dry run, since selecting the due rows IS the same statement as claiming
-- them. Same WHERE conditions, duplicated here on purpose rather than
-- shared, since this one is read-only (no FOR UPDATE, no UPDATE).
create or replace function public.count_due_class_reminders(p_hours integer default 24)
returns integer
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select count(*)::integer
  from public.bookings as b
  join public.class_sessions as cs on cs.id = b.session_id
  where b.status = 'confirmed'
    and b.payment_status = 'paid'
    and b.reminder_sent_at is null
    and cs.status = 'scheduled'
    and (cs.session_date + cs.start_time) at time zone 'Asia/Jerusalem' > now()
    and (cs.session_date + cs.start_time) at time zone 'Asia/Jerusalem'
        <= now() + make_interval(hours => p_hours);
$$;

revoke all on function public.count_due_class_reminders(integer)
  from public, anon, authenticated;
grant execute on function public.count_due_class_reminders(integer) to service_role;
-- Test: should always equal the number of rows claim_due_class_reminders()
--   would return right now, for the same p_hours, without changing anything.

-- =============================================================================
-- 3. release_class_reminder(p_booking_id) - undo a claim after a failed send
-- =============================================================================

create or replace function public.release_class_reminder(p_booking_id uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.bookings
  set reminder_sent_at = null
  where id = p_booking_id;
$$;

revoke all on function public.release_class_reminder(uuid)
  from public, anon, authenticated;
grant execute on function public.release_class_reminder(uuid) to service_role;
-- Test: claim a booking, then release it - reminder_sent_at is null again
--   and a later claim call picks it back up (if still due).

-- =============================================================================
-- 4. admin_notification_queue
-- =============================================================================
--
-- RLS is enabled with ZERO policies, which is a deliberate deny-all: no
-- row is selectable, insertable, or updatable by anon or authenticated (or
-- even an authenticated admin) through PostgREST, regardless of any
-- table-level grant. Only the service role (which bypasses RLS entirely,
-- by Postgres/Supabase's own built-in rule) or a SECURITY DEFINER function
-- (which also bypasses RLS) can ever touch this table. That's exactly the
-- two things that do: the trigger function in section 5, and the two
-- service_role-only functions in section 6.
create table if not exists public.admin_notification_queue (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('booking', 'session_request', 'order', 'course_purchase')),
  ref_id uuid not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  attempts integer not null default 0
);

alter table public.admin_notification_queue enable row level security;

-- Belt-and-suspenders alongside the RLS-with-zero-policies deny-all above:
-- even if a future policy is ever added, anon/authenticated still have no
-- table-level grant to fall back on.
revoke all on public.admin_notification_queue from anon, authenticated;

-- =============================================================================
-- 5. enqueue_admin_notification() - one trigger function, four triggers
-- =============================================================================
--
-- The whole body is wrapped in its own BEGIN/EXCEPTION block so this can
-- NEVER fail the booking/order/session_request/course_purchase insert it's
-- attached to - if the queue insert itself fails for any reason (a bug here,
-- the queue table missing, whatever), the error is downgraded to a WARNING
-- (logged, with the original sqlerrm, but not re-raised) and the real
-- insert that triggered this proceeds completely unaffected. The "kind"
-- value comes from the trigger definition's own argument (TG_ARGV[0])
-- rather than being hardcoded per-table, so one function serves all four
-- tables.
create or replace function public.enqueue_admin_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  begin
    insert into public.admin_notification_queue (kind, ref_id)
    values (tg_argv[0], new.id);
  exception when others then
    raise warning 'enqueue_admin_notification failed: %', sqlerrm;
  end;
  return new;
end;
$$;

revoke all on function public.enqueue_admin_notification()
  from public, anon, authenticated;
grant execute on function public.enqueue_admin_notification() to service_role;

drop trigger if exists enqueue_admin_notification on public.bookings;
create trigger enqueue_admin_notification
  after insert on public.bookings
  for each row execute function public.enqueue_admin_notification('booking');

drop trigger if exists enqueue_admin_notification on public.orders;
create trigger enqueue_admin_notification
  after insert on public.orders
  for each row execute function public.enqueue_admin_notification('order');

drop trigger if exists enqueue_admin_notification on public.session_requests;
create trigger enqueue_admin_notification
  after insert on public.session_requests
  for each row execute function public.enqueue_admin_notification('session_request');

drop trigger if exists enqueue_admin_notification on public.course_purchases;
create trigger enqueue_admin_notification
  after insert on public.course_purchases
  for each row execute function public.enqueue_admin_notification('course_purchase');
-- Test: insert a test row directly into each of the four tables (or go
--   through the normal app flow - book a class, place an order as a member
--   and as a guest, submit a private-session request, buy a course) and
--   confirm exactly one admin_notification_queue row appears each time,
--   with the right "kind" and ref_id = the new row's id.
-- Test (queue table temporarily renamed/broken): the booking/order/request/
--   purchase insert still succeeds - only the queue insert silently fails.

-- =============================================================================
-- 6. claim_admin_notifications(p_limit default 50) / release_admin_notifications(p_ids)
-- =============================================================================
--
-- Only rows with attempts < 5 are claimed - a row that's already failed to
-- send 5 times (release_admin_notifications increments attempts on every
-- claim, so a row that keeps getting released keeps accumulating attempts)
-- is left alone rather than retried forever. It stays unsent (sent_at null,
-- so count_pending_admin_notifications still counts it) but is no longer
-- picked up - a stuck row needs a human to look at it, not an infinite retry
-- loop.
create or replace function public.claim_admin_notifications(p_limit integer default 50)
returns setof public.admin_notification_queue
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  with due as (
    select q.id
    from public.admin_notification_queue as q
    where q.sent_at is null
      and q.attempts < 5
    order by q.created_at
    limit p_limit
    for update skip locked
  )
  update public.admin_notification_queue as q
  set sent_at = now(), attempts = q.attempts + 1
  from due as d
  where q.id = d.id
  returning q.*;
end;
$$;

revoke all on function public.claim_admin_notifications(integer)
  from public, anon, authenticated;
grant execute on function public.claim_admin_notifications(integer) to service_role;

create or replace function public.release_admin_notifications(p_ids uuid[])
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.admin_notification_queue
  set sent_at = null
  where id = any(p_ids);
$$;

revoke all on function public.release_admin_notifications(uuid[])
  from public, anon, authenticated;
grant execute on function public.release_admin_notifications(uuid[]) to service_role;
-- Test: with 3 unsent queue rows, claim_admin_notifications(2) returns 2
--   rows (oldest first), each with sent_at now set and attempts incremented
--   by 1; the 3rd is untouched. release_admin_notifications on those 2 ids
--   sets their sent_at back to null (attempts stays incremented, since a
--   retry did genuinely happen) and a later claim picks them up again.

-- Read-only companion, same reasoning as count_due_class_reminders() above -
-- needed for GET /api/cron/admin-notifications?dry=1.
create or replace function public.count_pending_admin_notifications()
returns integer
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select count(*)::integer
  from public.admin_notification_queue
  where sent_at is null;
$$;

revoke all on function public.count_pending_admin_notifications()
  from public, anon, authenticated;
grant execute on function public.count_pending_admin_notifications() to service_role;

-- Make everything above visible to PostgREST immediately.
notify pgrst, 'reload schema';

commit;

-- =============================================================================
-- Manual test queries - run as postgres in the SQL editor
-- =============================================================================
--
-- Each is wrapped in its own begin/rollback so nothing is actually consumed:
-- claim_due_class_reminders and claim_admin_notifications both mutate rows
-- (reminder_sent_at / sent_at+attempts) as part of selecting them, and
-- rollback undoes that after you've seen the result, leaving the real data
-- untouched for the next real cron run.
--
-- begin;
-- select count_due_class_reminders(24);
-- rollback;
--
-- begin;
-- select * from claim_due_class_reminders(24);
-- rollback;
--
-- begin;
-- select * from claim_admin_notifications(5);
-- rollback;

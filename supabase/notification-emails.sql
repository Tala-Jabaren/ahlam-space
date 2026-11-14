-- Notification emails (feature/notification-emails): trip meeting time/
-- point, the trip reminder cron (extends claim_due_class_reminders'
-- REMINDER_HOURS window to trips too), and the admin "message
-- participants" rate-limited log table.
--
-- Revised after SQL review:
--   - trip_participant_messages.sent_by is now nullable with ON DELETE
--     SET NULL (was: not null, no delete action - which would have
--     blocked deleting a test admin account from the Dashboard once it
--     had sent any message). admin_log_trip_message still only ever
--     inserts auth.uid() - never null at insert time, since it already
--     raises FORBIDDEN first if auth.uid() is null - so this only ever
--     matters later, after a sent_by account is deleted. Nothing reads
--     this column expecting it to be non-null: the rate-limit check in
--     that same function filters `where sent_by = auth.uid()`, and a
--     real caller's auth.uid() is never null, so an orphaned (sent_by is
--     null) row simply can't match anyone's rate-limit count - a deleted
--     admin's past sends correctly stop counting against anyone.
--   - claim_due_trip_reminders/count_due_trip_reminders now also require
--     t.status in ('open', 'closed') - trips.status has no literal
--     'cancelled' value (see its check constraint in supabase/trips.sql:
--     only 'draft', 'open', 'closed', 'past'), so "not published" is
--     draft and the closest match to "cancelled" for a trip that's no
--     longer relevant is past. 'closed' is deliberately KEPT, not
--     excluded - it only means applications are no longer open, not that
--     the trip itself was cancelled; an already-approved applicant whose
--     trip's registration window closed still needs their reminder for a
--     trip that's genuinely still happening.
--
-- REVIEW AND RUN MANUALLY in the Supabase SQL editor. NOT run by Claude.
-- Written to be safely re-runnable (CREATE OR REPLACE, ADD COLUMN IF NOT
-- EXISTS, idempotent grants) - same convention as every other file in this
-- directory. Pure DDL (new columns/functions/table), no data is deleted or
-- modified by anything below, so there is nothing destructive to roll back;
-- if you ever do want to undo this file specifically:
--   drop function if exists public.claim_due_trip_reminders(integer, integer);
--   drop function if exists public.release_trip_reminder(uuid);
--   drop function if exists public.count_due_trip_reminders(integer);
--   drop function if exists public.admin_log_trip_message(uuid, text, integer);
--   drop table if exists public.trip_participant_messages;
--   (the sent_by nullable/ON DELETE SET NULL change and the t.status
--   filter on claim/count_due_trip_reminders have no separate rollback -
--   they only matter while those functions/that table still exist)
--   alter table public.trip_applications drop column if exists reminder_sent_at;
--   alter table public.trips drop column if exists meeting_time;
--   alter table public.trips drop column if exists meeting_point;
-- (claim_due_class_reminders/count_due_class_reminders would need restoring
-- to their previous p_hours default of 24 by hand - see section 1 below.)
--
-- Schema touched here, verified against supabase/trips.sql and
-- supabase/class-reminders.sql:
--   trips(id, title, description, location, starts_on, ends_on,
--         application_deadline, capacity, cover_image_url, status,
--         created_at) - meeting_time/meeting_point added in section 2.
--   trip_applications(id, trip_id, user_id, full_name, phone, email,
--                      ..., status, admin_note, reviewed_at, reviewed_by,
--                      created_at) - reminder_sent_at added in section 2.
--
-- Security model: claim_due_trip_reminders/release_trip_reminder/count_due_
-- trip_reminders follow the exact same reasoning as their class-reminder
-- counterparts in supabase/class-reminders.sql (cron-job-only, granted to
-- service_role only, no is_admin() check needed). admin_log_trip_message
-- is the one exception in this file: it IS meant to be called by an
-- authenticated admin directly (from the "message participants" route),
-- so it checks is_admin() like every other admin_*-named RPC in this
-- project.

begin;

-- =============================================================================
-- 1. REMINDER_HOURS: 24 -> 12 for the existing class-reminder functions
-- =============================================================================
--
-- Same signatures as already deployed (chore/deploy-final-prep) - only the
-- default literal changes, so this is a plain CREATE OR REPLACE, not a new
-- overload (contrast with how that same earlier pass had to DROP FUNCTION
-- first when it added p_limit - that doesn't apply here, the parameter
-- list itself is unchanged). The route always passes p_hours explicitly
-- (REMINDER_HOURS, src/lib/reminder-constants.ts) now, so this default
-- only matters for a manual SQL call that omits it.

create or replace function public.claim_due_class_reminders(p_hours integer default 12, p_limit integer default 50)
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
      and (cs.session_date + cs.start_time) at time zone 'Asia/Hebron' > now()
      and (cs.session_date + cs.start_time) at time zone 'Asia/Hebron'
          <= now() + make_interval(hours => p_hours)
    order by (cs.session_date + cs.start_time)
    limit p_limit
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

revoke all on function public.claim_due_class_reminders(integer, integer)
  from public, anon, authenticated;
grant execute on function public.claim_due_class_reminders(integer, integer) to service_role;
-- Test: same tests as supabase/class-reminders.sql section 2 already
--   documents, just re-run with a session 10h from now (due at the new
--   12h default) instead of 18h (which was due at the old 24h default but
--   is now OUTSIDE the 12h default - still reachable by calling
--   claim_due_class_reminders(24) explicitly, confirming the parameter
--   still works, only the no-argument default moved).

create or replace function public.count_due_class_reminders(p_hours integer default 12)
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
    and (cs.session_date + cs.start_time) at time zone 'Asia/Hebron' > now()
    and (cs.session_date + cs.start_time) at time zone 'Asia/Hebron'
        <= now() + make_interval(hours => p_hours);
$$;

revoke all on function public.count_due_class_reminders(integer)
  from public, anon, authenticated;
grant execute on function public.count_due_class_reminders(integer) to service_role;

-- =============================================================================
-- 2. trips.meeting_time / trips.meeting_point, trip_applications.reminder_sent_at
-- =============================================================================
--
-- Both trip columns nullable, no default, no backfill - an existing trip
-- simply has no meeting time until an admin sets one, and (per section 3)
-- a trip with no meeting_time never produces a reminder at all, rather
-- than guessing one.

alter table public.trips
  add column if not exists meeting_time time;
alter table public.trips
  add column if not exists meeting_point text;

alter table public.trip_applications
  add column if not exists reminder_sent_at timestamptz;

-- =============================================================================
-- 3. claim_due_trip_reminders(p_hours default 12, p_limit default 50)
-- =============================================================================
--
-- Same shape as claim_due_class_reminders above (locking CTE -> UPDATE CTE
-- -> final SELECT joining back readable columns, same reason: Postgres
-- won't let the UPDATE target be referenced inside a FROM-list join). Only
-- approved applications, only trips that actually have a meeting_time set
-- (a trip with none simply never appears here - no reminder is ever sent
-- for it), only trips with status in ('open', 'closed') - see the header
-- comment for why 'draft'/'past' are excluded and 'closed' is kept -
-- multi-day trips use starts_on (their first day) + meeting_time, same
-- Asia/Hebron wall-clock math as the class reminder window.
create or replace function public.claim_due_trip_reminders(p_hours integer default 12, p_limit integer default 50)
returns table (
  application_id uuid,
  email text,
  trip_title text,
  starts_on date,
  location text,
  meeting_time time,
  meeting_point text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  with due as (
    select ta.id
    from public.trip_applications as ta
    join public.trips as t on t.id = ta.trip_id
    where ta.status = 'approved'
      and ta.reminder_sent_at is null
      and t.meeting_time is not null
      and t.status in ('open', 'closed')
      and (t.starts_on + t.meeting_time) at time zone 'Asia/Hebron' > now()
      and (t.starts_on + t.meeting_time) at time zone 'Asia/Hebron'
          <= now() + make_interval(hours => p_hours)
    order by (t.starts_on + t.meeting_time)
    limit p_limit
    for update of ta skip locked
  ),
  upd as (
    update public.trip_applications as ta
    set reminder_sent_at = now()
    from due as d
    where ta.id = d.id
    returning ta.id, ta.email, ta.trip_id
  )
  select
    upd.id as application_id,
    upd.email,
    t.title as trip_title,
    t.starts_on,
    t.location,
    t.meeting_time,
    t.meeting_point
  from upd
  join public.trips as t on t.id = upd.trip_id;
end;
$$;

revoke all on function public.claim_due_trip_reminders(integer, integer)
  from public, anon, authenticated;
grant execute on function public.claim_due_trip_reminders(integer, integer) to service_role;
-- Test (an approved application whose trip's starts_on + meeting_time is
--   10h from now, Asia/Hebron): one row returned, that application's
--   reminder_sent_at now set. Call again immediately: not returned a
--   second time.
-- Test (same, but the trip's meeting_time is null): never returned,
--   regardless of reminder_sent_at or how close starts_on is.
-- Test (same, but status = 'pending'/'waitlisted'/'declined'/'withdrawn'):
--   never returned.
-- Test (same, but the trip's own status is 'draft' or 'past'): never
--   returned, regardless of the application's own status or meeting_time.
-- Test (same, but the trip's own status is 'closed'): still returned -
--   'closed' only means applications are no longer open, not cancelled.
-- Test (p_limit): with 3 due applications and p_limit => 2, exactly the 2
--   with the soonest starts_on + meeting_time are claimed; the 3rd stays
--   due for the next call.

create or replace function public.release_trip_reminder(p_application_id uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.trip_applications
  set reminder_sent_at = null
  where id = p_application_id;
$$;

revoke all on function public.release_trip_reminder(uuid)
  from public, anon, authenticated;
grant execute on function public.release_trip_reminder(uuid) to service_role;

-- Read-only companion for GET /api/cron/class-reminders?dry=1's trips half -
-- same reasoning as count_due_class_reminders (claiming and counting can't
-- be the same statement for a true dry run).
create or replace function public.count_due_trip_reminders(p_hours integer default 12)
returns integer
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select count(*)::integer
  from public.trip_applications as ta
  join public.trips as t on t.id = ta.trip_id
  where ta.status = 'approved'
    and ta.reminder_sent_at is null
    and t.meeting_time is not null
    and t.status in ('open', 'closed')
    and (t.starts_on + t.meeting_time) at time zone 'Asia/Hebron' > now()
    and (t.starts_on + t.meeting_time) at time zone 'Asia/Hebron'
        <= now() + make_interval(hours => p_hours);
$$;

revoke all on function public.count_due_trip_reminders(integer)
  from public, anon, authenticated;
grant execute on function public.count_due_trip_reminders(integer) to service_role;

-- =============================================================================
-- 4. trip_participant_messages - admin "message participants" log + rate limit
-- =============================================================================
--
-- RLS enabled with ZERO policies - same deliberate deny-all as
-- admin_notification_queue in supabase/class-reminders.sql: no row is
-- readable or writable by anon/authenticated (admins included) through
-- PostgREST directly. Only admin_log_trip_message() below (SECURITY
-- DEFINER, bypasses RLS) can write to it. The actual emails are sent by
-- the Next.js route after this function returns successfully - this table
-- only ever records that a send happened (who/when/subject/trip/recipient
-- count), never the message body and never the recipient list itself.
create table if not exists public.trip_participant_messages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  sent_by uuid references auth.users(id) on delete set null,
  subject text not null,
  recipient_count integer not null,
  created_at timestamptz not null default now()
);

-- Idempotent fix for a table that may already exist from an earlier run
-- of this file (CREATE TABLE IF NOT EXISTS above only applies to a fresh
-- table): sent_by was originally NOT NULL with no delete action, which
-- would block deleting a test admin account from the Dashboard once it
-- had sent any message. Made nullable, ON DELETE SET NULL instead -
-- Postgres' default constraint name for an inline, unnamed column
-- reference on this table is trip_participant_messages_sent_by_fkey.
alter table public.trip_participant_messages
  alter column sent_by drop not null;
alter table public.trip_participant_messages
  drop constraint if exists trip_participant_messages_sent_by_fkey;
alter table public.trip_participant_messages
  add constraint trip_participant_messages_sent_by_fkey
  foreign key (sent_by) references auth.users(id) on delete set null;

alter table public.trip_participant_messages enable row level security;
revoke all on public.trip_participant_messages from anon, authenticated;

-- Rate limit: at most 5 sends per admin per rolling hour, across all trips
-- - generous enough for normal use (one trip rarely needs more than one or
-- two messages a day) while making an accidental multi-click or a compromised
-- admin session unable to blast every approved applicant's inbox
-- unboundedly. Raises RATE_LIMITED (not a silent no-op) so the route can
-- show the admin a clear "try again later" instead of a generic failure.
create or replace function public.admin_log_trip_message(p_trip_id uuid, p_subject text, p_recipient_count integer)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_recent_count integer;
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  if p_subject is null or char_length(trim(p_subject)) = 0 or char_length(p_subject) > 200 then
    raise exception 'INVALID_SUBJECT';
  end if;
  if p_recipient_count is null or p_recipient_count < 1 then
    raise exception 'NO_RECIPIENTS';
  end if;

  select count(*) into v_recent_count
  from public.trip_participant_messages
  where sent_by = auth.uid()
    and created_at > now() - interval '1 hour';

  if v_recent_count >= 5 then
    raise exception 'RATE_LIMITED';
  end if;

  insert into public.trip_participant_messages (trip_id, sent_by, subject, recipient_count)
  values (p_trip_id, auth.uid(), trim(p_subject), p_recipient_count)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.admin_log_trip_message(uuid, text, integer)
  from public, anon;
grant execute on function public.admin_log_trip_message(uuid, text, integer) to authenticated;
-- Test (as a non-admin, or signed out): FORBIDDEN.
-- Test (as admin, 6th call within the same hour): RATE_LIMITED on the 6th
--   call; a call made just over an hour after the 1st succeeds again.
-- Test: the inserted row's subject/recipient_count/trip_id/sent_by match
--   what was passed/the caller; the message body itself is never stored
--   here (it's not a column on this table at all).
-- Test (sent_by nullable): delete that admin's auth.users row from the
--   Dashboard afterward - succeeds (no longer blocked), and the message
--   row still exists with sent_by now null. A later call by a different
--   admin still rate-limits correctly (`where sent_by = auth.uid()` never
--   matches a null sent_by against any real caller's uid, so that
--   orphaned row correctly stops counting toward anyone's limit).

-- Make everything above visible to PostgREST immediately.
notify pgrst, 'reload schema';

commit;

-- =============================================================================
-- Manual test queries - run as postgres in the SQL editor
-- =============================================================================
--
-- begin;
-- select count_due_trip_reminders(12);
-- rollback;
--
-- begin;
-- select * from claim_due_trip_reminders(12);
-- rollback;

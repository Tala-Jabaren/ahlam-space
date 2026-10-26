-- Turns on the two expiry sweeps that admin-payments.sql already ships as
-- functions but leaves commented out as scheduled jobs (section 6 for
-- expire_unpaid_orders, section 8 for expire_unpaid_bookings) - see the
-- "Scheduled run via pg_cron - commented out on purpose" comments there.
-- This file just runs those exact same commented-out calls for real.
--
-- REVIEW AND RUN MANUALLY in the Supabase SQL editor. NOT run by Claude.
-- Requires the pg_cron extension to be enabled first (Database > Extensions
-- > pg_cron in the Supabase dashboard) - cron.schedule() errors otherwise.
-- Requires supabase/admin-payments.sql to already be applied (both functions
-- must exist: public.expire_unpaid_orders(int), public.expire_unpaid_bookings()).
--
-- Idempotent: cron.schedule() with a job name that already exists updates
-- that job in place rather than creating a duplicate (same pattern already
-- used by supabase/weekly-class-sessions.sql for its own daily job) - running
-- this file again, or later editing the schedule here and re-running it, is
-- safe.
--
-- Job names match exactly what admin-payments.sql's own commented-out draft
-- uses ('expire-unpaid-orders-hourly' / 'expire-unpaid-bookings-hourly'), so
-- if those lines are ever uncommented directly in admin-payments.sql instead
-- of running this file, they'll land on the same job slot rather than create
-- a second, duplicate schedule.
--
-- Both functions' own admin guard (`if auth.uid() is not null and not
-- public.is_admin() then raise exception 'FORBIDDEN'`) only fires when
-- there's an authenticated-but-non-admin caller. pg_cron jobs run with no
-- PostgREST/Supabase Auth session at all, so auth.uid() is null and the
-- guard is skipped - no extra grant is needed for the cron job itself to
-- call them.

begin;

-- expire_unpaid_orders(48): bank-transfer orders still 'pending' more than
-- 48h after creation get cancelled and their stock restored. Top of every
-- hour, exactly as drafted (commented out) in admin-payments.sql section 6.
select cron.schedule(
  'expire-unpaid-orders-hourly',
  '0 * * * *',
  $$ select public.expire_unpaid_orders(48); $$
);

-- expire_unpaid_bookings(): bank-transfer bookings whose reserved_until hold
-- has passed get cancelled and the session's booked_count decremented. Top
-- of every hour, exactly as drafted (commented out) in admin-payments.sql
-- section 8.
select cron.schedule(
  'expire-unpaid-bookings-hourly',
  '0 * * * *',
  $$ select public.expire_unpaid_bookings(); $$
);

commit;

-- Read-only verification after running the above:
--
-- Confirm both jobs are registered and active:
--   select jobid, jobname, schedule, active
--   from cron.job
--   where jobname in ('expire-unpaid-orders-hourly', 'expire-unpaid-bookings-hourly');
--
-- Confirm they've actually fired (wait for the next top-of-hour first) and
-- succeeded - "succeeded" in return_message, no error text:
--   select j.jobname, r.status, r.return_message, r.start_time, r.end_time
--   from cron.job_run_details as r
--   join cron.job as j on j.jobid = r.jobid
--   where j.jobname in ('expire-unpaid-orders-hourly', 'expire-unpaid-bookings-hourly')
--   order by r.start_time desc
--   limit 10;
--
-- Spot-check the effect directly (expect zero rows once the sweep has run,
-- assuming no fresh test data is older than the cutoff):
--   select id, status, created_at from public.orders
--   where status = 'pending' and created_at < now() - interval '48 hours';
--   select id, status, reserved_until from public.bookings
--   where status = 'pending' and reserved_until < now();

-- To turn a schedule back off later, run manually:
--   select cron.unschedule('expire-unpaid-orders-hourly');
--   select cron.unschedule('expire-unpaid-bookings-hourly');

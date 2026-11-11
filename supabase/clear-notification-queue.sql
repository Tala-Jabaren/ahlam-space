-- REVIEW AND RUN MANUALLY in the Supabase SQL editor. NOT run by Claude.
--
-- Clears out stuck/unsent rows in public.admin_notification_queue (see
-- supabase/class-reminders.sql section 4-6) - e.g. after a long
-- RESEND_API_KEY/EMAIL_FROM misconfiguration let a batch of rows exhaust
-- their 5 retry attempts (claim_admin_notifications stops claiming a row
-- once attempts >= 5), so they'd otherwise sit unsent forever. This only
-- deletes the queue markers - it never touches the real
-- bookings/orders/session_requests/course_purchases rows those markers
-- pointed at, and clearing the queue does not resend anything; it just
-- gives up on notifying the owner about whatever's in it right now (new
-- activity re-queues itself immediately via the triggers in
-- class-reminders.sql section 5, unaffected by this file).
--
-- SAFE BY DEFAULT: wrapped in begin;...rollback;, so running it top to
-- bottom as-is deletes nothing permanently. When you're ready to actually
-- clear it, change the final "rollback;" to "commit;" and run it again.

-- =============================================================================
-- PREVIEW - how many unsent rows are there right now, and how old is the
-- oldest one (a large age gap is the usual sign something's actually stuck,
-- not just mid-retry).
-- =============================================================================

select
  count(*) as unsent_count,
  min(created_at) as oldest_created_at,
  max(attempts) as max_attempts_seen
from public.admin_notification_queue
where sent_at is null;

-- =============================================================================
-- DELETE - one transaction, safe by default (rollback).
-- =============================================================================

begin;

delete from public.admin_notification_queue
where sent_at is null;

-- =============================================================================
-- Nothing above is permanent yet - this transaction ends in a rollback.
-- =============================================================================
-- To actually delete, change the line below from "rollback;" to "commit;"
-- and run this whole block again from its "begin;" line.
rollback;

-- =============================================================================
-- POST-DELETE VERIFICATION - run after a committed run. Expect unsent_count
-- to be 0 (any row counted here was re-queued by real activity after the
-- delete above, not left over from it).
-- =============================================================================

select count(*) as unsent_count
from public.admin_notification_queue
where sent_at is null;

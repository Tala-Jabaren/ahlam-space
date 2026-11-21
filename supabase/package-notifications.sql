-- Package purchases notify Ahlam the same way bookings/orders/course
-- purchases/trip applications already do: a new row in
-- admin_notification_queue, picked up by the existing one-email-per-event
-- cron, and counted by the existing admin sidebar badge (unseen).
--
-- REVIEW AND RUN MANUALLY in the Supabase SQL editor as postgres, AFTER
-- supabase/class-packages.sql. Written to run once; re-running is safe
-- (CREATE OR REPLACE / DROP TRIGGER IF EXISTS / drop-then-recreate the
-- named CHECK constraint, same pattern trips.sql already used to add
-- 'trip_application').
--
-- Do NOT set PACKAGES_ENABLED until this has been run and reviewed live -
-- this file only ever matters once create_package_purchase is actually
-- being called, which itself requires the flag.
--
-- REUSES (does not duplicate):
--   public.admin_notification_queue, public.enqueue_admin_notification()
--     (supabase/class-reminders.sql) - package_purchases gets the same
--     generic after-insert trigger bookings/orders/course_purchases
--     already use (it's a simple one-time insert, like those three - not
--     a "reopen an existing row" case like trip_application's own
--     dedicated trigger function).
--   The admin sidebar's existing NotificationBadge/NotificationItem
--     components and markAdminNotificationSeen action - untouched. Only
--     this file's own app-side companion changes are: adding
--     'package_purchase' to the shared AdminNotificationKind list, and
--     wrapping each row in src/components/admin/sections/package-
--     payments.tsx with the existing NotificationItem (it previously used
--     a plain, non-collapsible card with no seen-tracking at all).
--   src/lib/email/owner-notification-email.ts's existing generic email
--     builder (one shared template function, kind-specific label maps) -
--     this just adds 'package_purchase' entries to those maps, not a
--     second email-building function.
--
-- NOT changed: the existing event kinds (booking/session_request/order/
-- course_purchase/trip_application) keep their exact current behavior -
-- this file only adds a new kind alongside them.
--
-- =============================================================================
-- ROLLBACK (keep this up to date; run manually if this needs to be undone):
-- =============================================================================
--
-- begin;
-- drop trigger if exists enqueue_admin_notification on public.package_purchases;
-- alter table public.admin_notification_queue
--   drop constraint if exists admin_notification_queue_kind_check;
-- alter table public.admin_notification_queue
--   add constraint admin_notification_queue_kind_check
--   check (kind in ('booking', 'session_request', 'order', 'course_purchase', 'trip_application'));
-- notify pgrst, 'reload schema';
-- commit;
--
-- =============================================================================
-- PRE-FLIGHT (read-only - run these first and review the output):
-- =============================================================================
--
-- (a) Confirm class-packages.sql has already been run:
-- select table_name from information_schema.tables
-- where table_schema = 'public' and table_name = 'package_purchases';
--
-- (b) Confirm the reused objects already exist:
-- select proname from pg_proc where proname = 'enqueue_admin_notification';
-- select conname from pg_constraint where conname = 'admin_notification_queue_kind_check';
--
-- (c) Read the CURRENT allowed kind list before widening it, so the ALTER
-- below includes every existing kind plus the new one, not just the ones
-- this file's author happened to remember:
-- select pg_get_constraintdef(oid) from pg_constraint
-- where conname = 'admin_notification_queue_kind_check';

begin;

-- =============================================================================
-- 1. Widen admin_notification_queue.kind to allow 'package_purchase'
-- =============================================================================
--
-- Same risk note trips.sql already carries for this same constraint: if
-- another branch widens it independently with a different new kind, the
-- one run last in the editor wins and would silently drop the other
-- branch's kind. The list below is every kind that exists as of this
-- writing (confirmed via the pre-flight query above) plus 'package_purchase' -
-- if that's changed by the time this runs, union the lists, don't replace them.

alter table public.admin_notification_queue
  drop constraint if exists admin_notification_queue_kind_check;
alter table public.admin_notification_queue
  add constraint admin_notification_queue_kind_check
  check (kind in ('booking', 'session_request', 'order', 'course_purchase', 'trip_application', 'package_purchase'));

-- =============================================================================
-- 2. Enqueue a notification on every new package purchase
-- =============================================================================
--
-- A pending purchase is exactly as "new" an event as a pending booking/
-- order/course purchase - all four already notify on INSERT regardless of
-- status, not just once paid, so this matches that existing behavior
-- rather than inventing a different rule for packages.

drop trigger if exists enqueue_admin_notification on public.package_purchases;
create trigger enqueue_admin_notification
  after insert on public.package_purchases
  for each row execute function public.enqueue_admin_notification('package_purchase');
-- Test: call create_package_purchase as a member (see class-packages.sql),
--   then confirm exactly one admin_notification_queue row appears with
--   kind = 'package_purchase' and ref_id = the new purchase's id.
-- Test (queue table temporarily broken/renamed): the purchase insert still
--   succeeds - same resilience as the other three triggers, inherited for
--   free from the shared enqueue_admin_notification() function.

-- Make all of the above visible to PostgREST immediately.
notify pgrst, 'reload schema';

commit;

-- =============================================================================
-- App-side companion changes made alongside this file (TypeScript, no SQL
-- of their own - listed here so a reviewer knows where to look):
-- =============================================================================
--
-- src/lib/admin-notification-links.ts: 'package_purchase' added to
--   notificationKinds, with notificationDestinations pointing it at
--   /admin/classes?tab=payments (same screen bookings already route to -
--   there is no separate nav item for packages).
-- src/components/admin/notifications/notification-data.ts:
--   getAdminNotificationCounts() folds the package_purchase count into
--   the same "booking" number the /admin/classes sidebar badge already
--   reads (AdminNavItem only supports one notificationKind per nav item -
--   this avoids widening that shared type/component for one new kind).
-- src/lib/admin-notifications.ts: NotificationQueueRow['kind'] and
--   loadNotificationEvent() gained a 'package_purchase' branch (join
--   class_packages for the package name, profiles for the member's name/
--   phone) - mirrors the existing course_purchase branch exactly.
-- src/lib/email/owner-notification-email.ts: 'package_purchase' added to
--   OwnerNotificationEventKind, SUBJECT_LABELS and KIND_LABELS only - the
--   existing generic row-building/status-label logic needed no changes
--   (package_purchases' pending/paid/cancelled statuses already fall
--   through to the existing FINANCIAL_STATUS_LABELS map correctly).
-- src/components/admin/sections/package-payments.tsx: each purchase row
--   now renders inside the existing NotificationItem (title/preview/
--   status, same as DomainPayments' booking/course/order rows) instead of
--   a plain card, so opening one actually marks it seen - previously
--   nothing in that component ever called markAdminNotificationSeen, so
--   the sidebar badge would have counted it but never cleared.

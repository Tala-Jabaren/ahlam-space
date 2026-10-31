-- REVIEW AND RUN MANUALLY in the Supabase SQL editor. NOT run by Claude.
--
-- Removes ONLY test data created while building and testing the site:
--   A. profiles matching known test-account email patterns, and everything
--      those accounts own (bookings, orders+order_items, course_purchases,
--      payments). Also session_requests matching the same patterns.
--   B. NOT done here anymore - the four named test records (order AS-1029,
--      booking AS-1030, course purchases AS-1032/AS-1034). Delete those
--      from the admin UI instead; see the comment in section B below.
--   C. public.admin_notification_queue, cleared entirely (ephemeral queue
--      data, not user data - safe to clear in full regardless of test vs
--      real, since every row there just gets re-queued by normal app use).
--
-- Does NOT touch: admin accounts (profiles.role = 'admin'), products,
-- product_variants, classes, class_sessions, or courses. Does NOT delete
-- from auth.users directly - see the note in section A before running.
--
-- THE SQL EDITOR ONLY SHOWS THE RESULT OF THE LAST STATEMENT YOU RUN. The
-- preview block below has several SELECTs for this reason - run each one
-- by itself (highlight just that statement and run the selection) so you
-- actually see its result, rather than pasting the whole block at once.
--
-- SAFE BY DEFAULT: the delete block further down runs inside
-- begin;...rollback;, so running it top to bottom as-is deletes nothing
-- permanently - every change is undone by the rollback at the end. When
-- you're ready to actually delete, change that block's final "rollback;"
-- to "commit;" and run it again.

-- =============================================================================
-- PREVIEW - run each statement below ONE AT A TIME, outside any transaction,
-- and read its result before touching the delete block further down.
-- =============================================================================

-- (a) run this alone and read the result: matched test profiles, with how
-- much data each one owns.
select
  p.id,
  u.email,
  p.role,
  p.created_at,
  (select count(*) from public.orders o where o.user_id = p.id) as order_count,
  (select count(*) from public.bookings b where b.user_id = p.id) as booking_count,
  (select count(*) from public.course_purchases cp where cp.user_id = p.id) as course_purchase_count,
  (select count(*) from public.payments pay where pay.user_id = p.id) as payment_count
from public.profiles p
join auth.users u on u.id = p.id
where p.role is distinct from 'admin'
  and (
    u.email like '%@example.com'
    or u.email like 'security-bump-smoketest-%'
    or u.email like 'media-upload-guard-check-%'
    or u.email like 'meditation-state-test-%'
    or u.email like 'meditation-reload-test-%'
    or u.email like 'meditation-rpc-bypass-%'
  )
order by p.created_at;

-- (b) run this alone and read the result: guest (no-account) orders whose
-- guest_email matches the same patterns. These are NOT covered by (a)
-- since they have no profiles row.
select id, reference, guest_email, status, paid_at, created_at
from public.orders
where guest_email like '%@example.com'
   or guest_email like 'security-bump-smoketest-%'
   or guest_email like 'media-upload-guard-check-%'
   or guest_email like 'meditation-state-test-%'
   or guest_email like 'meditation-reload-test-%'
   or guest_email like 'meditation-rpc-bypass-%'
order by created_at;

-- (c) run this alone and read the result: session_requests matching the
-- same patterns (public form, no login, no user_id column).
select id, full_name, phone, email, created_at
from public.session_requests
where email like '%@example.com'
   or email like 'security-bump-smoketest-%'
   or email like 'media-upload-guard-check-%'
   or email like 'meditation-state-test-%'
   or email like 'meditation-reload-test-%'
   or email like 'meditation-rpc-bypass-%'
order by created_at;

-- (d) run this alone and read the result: the four named test records, by
-- reference, with exactly the columns that determine whether admin_delete_
-- record will accept or refuse deleting them from the admin UI (see the
-- protection-rules comment in section B below).
select o.id, o.reference, o.status, o.paid_at,
  exists (select 1 from public.payments p where p.order_id = o.id) as has_payment_row
from public.orders o where o.reference = 'AS-1029';

select b.id, b.reference, b.status, b.payment_status, b.paid_at,
  exists (select 1 from public.payments p where p.booking_id = b.id) as has_payment_row
from public.bookings b where b.reference = 'AS-1030';

select cp.id, cp.reference, cp.status, cp.paid_at
from public.course_purchases cp where cp.reference in ('AS-1032', 'AS-1034');

-- (e) run this alone and read the result: confirms every column this
-- script relies on actually exists, before you rely on it. Expect exactly
-- 6 rows back. Fewer than 6 means a column name below is wrong and any
-- delete statement using it would fail - better to find that out here than
-- mid-run.
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'payments' and column_name in ('user_id', 'order_id', 'booking_id'))
    or (table_name = 'orders' and column_name = 'user_id')
    or (table_name = 'bookings' and column_name = 'user_id')
    or (table_name = 'course_purchases' and column_name = 'user_id')
  )
order by table_name, column_name;

-- =============================================================================
-- DELETE - everything below is one transaction, safe by default (rollback).
-- =============================================================================

begin;

-- =============================================================================
-- A. Test accounts, by email pattern
-- =============================================================================
-- Exact patterns given: %@example.com, and these literal prefixes:
--   security-bump-smoketest-, media-upload-guard-check-,
--   meditation-state-test-, meditation-reload-test-, meditation-rpc-bypass-
-- profiles has no email column (see supabase/admin-payments.sql's schema
-- note) - email lives on auth.users, joined here by id. role <> 'admin' is
-- a second, redundant guard against ever matching an admin account, even
-- though none of these patterns plausibly would.

create temp table matched_test_profiles as
select p.id, u.email, p.role, p.created_at
from public.profiles p
join auth.users u on u.id = p.id
where p.role is distinct from 'admin'
  and (
    u.email like '%@example.com'
    or u.email like 'security-bump-smoketest-%'
    or u.email like 'media-upload-guard-check-%'
    or u.email like 'meditation-state-test-%'
    or u.email like 'meditation-reload-test-%'
    or u.email like 'meditation-rpc-bypass-%'
  );

-- Children before parents (payments/order_items reference bookings/orders;
-- bookings/orders/course_purchases reference profiles).
delete from public.payments
where user_id in (select id from matched_test_profiles);

delete from public.order_items
where order_id in (
  select id from public.orders where user_id in (select id from matched_test_profiles)
);

delete from public.bookings
where user_id in (select id from matched_test_profiles);
-- Note: this does not decrement class_sessions.booked_count for the
-- affected sessions - class_sessions is explicitly out of scope for this
-- script. The post-delete verification block below checks for exactly
-- this drift so you can correct it by hand if it matters.

delete from public.orders
where user_id in (select id from matched_test_profiles);
-- Note: this does not restore product_variants.stock - product_variants is
-- explicitly out of scope for this script. The app's own "cancel and
-- restock" admin action is the supported way to adjust stock; if a deleted
-- test order consumed real stock, correct it by hand afterward if it matters.

-- OPTIONAL - commented out by default. The member-account orders above do
-- not cover guest (no-account) test orders, previewed in (b) above.
-- Uncomment the two statements below only if you also want those deleted.
-- Same stock caveat as the member-order delete above applies.
--
-- delete from public.order_items
-- where order_id in (
--   select id from public.orders
--   where guest_email like '%@example.com'
--      or guest_email like 'security-bump-smoketest-%'
--      or guest_email like 'media-upload-guard-check-%'
--      or guest_email like 'meditation-state-test-%'
--      or guest_email like 'meditation-reload-test-%'
--      or guest_email like 'meditation-rpc-bypass-%'
-- );
--
-- delete from public.orders
-- where guest_email like '%@example.com'
--    or guest_email like 'security-bump-smoketest-%'
--    or guest_email like 'media-upload-guard-check-%'
--    or guest_email like 'meditation-state-test-%'
--    or guest_email like 'meditation-reload-test-%'
--    or guest_email like 'meditation-rpc-bypass-%';

delete from public.course_purchases
where user_id in (select id from matched_test_profiles);

-- session_requests has no login requirement and no user_id column (it's a
-- public form: full_name/phone/email as free text) - matched by email
-- directly against the same patterns, not via matched_test_profiles.
delete from public.session_requests
where email like '%@example.com'
   or email like 'security-bump-smoketest-%'
   or email like 'media-upload-guard-check-%'
   or email like 'meditation-state-test-%'
   or email like 'meditation-reload-test-%'
   or email like 'meditation-rpc-bypass-%';

delete from public.profiles
where id in (select id from matched_test_profiles)
  and role is distinct from 'admin';

-- NOT done here: deleting the matching auth.users rows themselves. Raw SQL
-- against auth.users/auth.identities/auth.sessions is not the Supabase-
-- supported path and can leave the auth schema inconsistent. After
-- confirming the profiles/app-data cleanup above looks right, remove the
-- matching accounts from Supabase Dashboard > Authentication > Users
-- instead (or auth.admin.deleteUser via the Admin API) - search there for
-- the same email patterns listed above.

drop table matched_test_profiles;

-- =============================================================================
-- B. Four named test records, by reference - NOT deleted by this file
-- =============================================================================
-- admin_delete_record checks admin status via auth.uid(), which PostgREST
-- normally sets from the caller's JWT. Called here in the SQL editor (as
-- the postgres/service role, with no such JWT) it raises FORBIDDEN - and
-- because the SQL editor runs a pasted block as one statement/transaction,
-- that FORBIDDEN would abort everything else in this file too, deleting
-- nothing even after switching rollback to commit. So this file does not
-- call it at all.
--
-- Delete AS-1029 (order), AS-1030 (booking), AS-1032 and AS-1034 (course
-- purchases) from the admin UI if they still exist after section A - that
-- runs admin_delete_record with a real admin session, where it's already
-- known to work.
--
-- Whether the admin UI will actually accept each one depends on live data
-- (see preview (d) above) against admin_delete_record's own rules:
--   order (AS-1029): blocked with PROTECTED_FINANCIAL_RECORD if paid_at is
--     not null, or status in ('paid','processing','shipped','delivered'),
--     or a public.payments row references it. Otherwise blocked with
--     CANCEL_ORDER_FIRST unless status = 'cancelled'. Deletable only if
--     status = 'cancelled' AND paid_at is null AND no matching payments row.
--   booking (AS-1030): blocked with PROTECTED_FINANCIAL_RECORD if
--     payment_status = 'paid', or paid_at is not null, or a public.payments
--     row references it. Otherwise blocked with CANCEL_BOOKING_FIRST unless
--     status = 'cancelled'. Deletable only if status = 'cancelled' AND
--     payment_status <> 'paid' AND paid_at is null AND no payments row.
--   course_purchase (AS-1032, AS-1034): blocked with
--     PROTECTED_FINANCIAL_RECORD if status <> 'pending' OR paid_at is not
--     null. Deletable only if status = 'pending' AND paid_at is null - i.e.
--     if either of these was ever actually paid (likely, if it was used to
--     test the paid-course audio-access flow), admin_delete_record WILL
--     refuse it in the admin UI too, by design. That is not a bug here.

-- =============================================================================
-- C. admin_notification_queue - cleared entirely (separate, labeled block)
-- =============================================================================
-- Queue/ephemeral data, not user data: every row here is just a pending
-- "send the owner a digest email" marker that gets re-queued by normal
-- booking/order/request/purchase activity. Safe to clear in full.
delete from public.admin_notification_queue;

-- =============================================================================
-- Nothing above is permanent yet - this transaction ends in a rollback.
-- =============================================================================
-- To actually delete, change the line below from "rollback;" to "commit;"
-- and run this whole block again from its "begin;" line.
rollback;

-- =============================================================================
-- POST-DELETE VERIFICATION - run these AFTER you've actually committed a
-- real run above. Plain read-only statements, run each one by itself.
-- =============================================================================

-- Sessions where booked_count has drifted from the real count of active
-- (pending or confirmed) bookings - expected to be empty unless a deleted
-- test booking inflated a real session's count (see the note in section A).
select cs.id, cs.class_id, cs.session_date, cs.start_time, cs.booked_count,
  (select count(*) from public.bookings b where b.session_id = cs.id and b.status in ('pending', 'confirmed')) as actual_active_bookings
from public.class_sessions cs
where cs.booked_count <> (
  select count(*) from public.bookings b where b.session_id = cs.id and b.status in ('pending', 'confirmed')
);

-- Leftover profiles matching the test patterns - expected to be empty after
-- a committed run. Any auth.users row for the same email will still show up
-- here until you've also removed it from the Dashboard (see section A) -
-- that's expected, not a failure of this script.
select p.id, u.email, p.role
from public.profiles p
join auth.users u on u.id = p.id
where p.role is distinct from 'admin'
  and (
    u.email like '%@example.com'
    or u.email like 'security-bump-smoketest-%'
    or u.email like 'media-upload-guard-check-%'
    or u.email like 'meditation-state-test-%'
    or u.email like 'meditation-reload-test-%'
    or u.email like 'meditation-rpc-bypass-%'
  );

-- Leftover rows for the four named references - expected to be empty only
-- once you've also deleted them from the admin UI per section B.
select 'order' as kind, id, reference, status from public.orders where reference = 'AS-1029'
union all
select 'booking' as kind, id, reference, status from public.bookings where reference = 'AS-1030'
union all
select 'course_purchase' as kind, id, reference, status from public.course_purchases where reference in ('AS-1032', 'AS-1034');

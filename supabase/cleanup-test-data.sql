-- REVIEW AND RUN MANUALLY in the Supabase SQL editor. NOT run by Claude.
--
-- Removes ONLY test data created while building and testing the site:
--   A. profiles/auth.users matching known test-account email patterns, and
--      everything those accounts own (bookings, orders+order_items,
--      course_purchases, payments)
--   B. four specific named test records by their human-readable reference
--      (order AS-1029, booking AS-1030, course purchases AS-1032/AS-1034),
--      deleted through public.admin_delete_record - the SAME function the
--      admin UI's delete buttons call - so the same protections for paid /
--      in-use records apply here, not a reimplementation of them.
--   C. public.admin_notification_queue, cleared entirely (ephemeral queue
--      data, not user data - safe to clear in full regardless of test vs
--      real, since every row there just gets re-queued by normal app use).
--
-- Does NOT touch: admin accounts (profiles.role = 'admin'), products,
-- product_variants, classes, class_sessions, or courses. Does NOT delete
-- from auth.users directly - see the note in section A before running.
--
-- SAFE BY DEFAULT: everything below runs inside begin;...rollback;, so
-- running this file top to bottom as-is deletes nothing permanently - the
-- SELECTs will show you exactly what *would* be removed, then every change
-- is undone by the rollback at the end. Read the SELECT output. When you're
-- ready to actually delete, change the final "rollback;" to "commit;" and
-- run the whole file again.

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

-- Print exactly who matched before deleting anything.
select * from matched_test_profiles order by created_at;

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
-- script. If a test booking inflated a real session's capacity count,
-- correct booked_count by hand afterward if it matters.

delete from public.orders
where user_id in (select id from matched_test_profiles);
-- Note: this does not restore product_variants.stock - product_variants is
-- explicitly out of scope for this script. The app's own "cancel and
-- restock" admin action is the supported way to adjust stock; if a deleted
-- test order consumed real stock, correct it by hand afterward if it matters.

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
-- B. Four named test records, by reference - via admin_delete_record
-- =============================================================================
-- Print current status first.
select 'order' as kind, id, reference, status, user_id from public.orders where reference = 'AS-1029'
union all
select 'booking' as kind, id, reference, status, user_id from public.bookings where reference = 'AS-1030'
union all
select 'course_purchase' as kind, id, reference, status, user_id from public.course_purchases where reference in ('AS-1032', 'AS-1034');

-- CAVEAT: admin_delete_record checks admin status via auth.uid(), which
-- PostgREST normally sets from the caller's JWT. Run directly here in the
-- SQL editor (as the postgres/service role, with no such JWT), it may raise
-- FORBIDDEN even though you are the real owner - that's the function
-- correctly refusing an unrecognized caller, not a bug. If any of the three
-- calls below raises FORBIDDEN (or PROTECTED_FINANCIAL_RECORD /
-- RECORD_IN_USE / CANCEL_ORDER_FIRST / CANCEL_BOOKING_FIRST), do not work
-- around it here - delete that specific record from the admin UI instead
-- (/admin/orders, /admin/payments), where the same function runs with a
-- real admin session and the same protections are already known to work.
select public.admin_delete_record('order', id) from public.orders where reference = 'AS-1029';
select public.admin_delete_record('booking', id) from public.bookings where reference = 'AS-1030';
select public.admin_delete_record('course_purchase', id) from public.course_purchases where reference in ('AS-1032', 'AS-1034');

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
-- and run this whole file again from the top.
rollback;

-- Enforces the 7-day post-payment-confirmation audio access window for
-- meditations. Builds on supabase/meditations.sql - requires it to already
-- be applied.
--
-- REVIEW AND RUN MANUALLY in the Supabase SQL editor. NOT run by Claude.
--
-- Proposed change and why it's necessary:
-- No new column. public.course_purchases.paid_at (added by
-- admin-payments.sql) is already the reliable, immutable payment
-- confirmation timestamp: admin_confirm_payment('course', p_id) is the only
-- place that ever sets it ("set status = 'paid', paid_at = now() where id =
-- p_id and paid_at is null" - admin-payments.sql section 4), it's
-- admin-only (is_admin() guard), and a trigger (admin-payments.sql section
-- 9) already blocks a client from inserting a course_purchases row with a
-- forged status/paid_at directly through the API. That makes
-- "paid_at + interval '7 days'" a correct, tamper-proof access-expiry
-- boundary without storing anything new - computed on the fly, same as the
-- rest of this project's "don't store what you can derive" pattern.
--
-- The only change is one added condition inside can_access_meditation(),
-- which is already the single choke point both the RPC
-- (get_meditation_audio_path) and the storage RLS policies on
-- storage.objects go through - so this one edit enforces the 7-day window
-- everywhere audio access is checked, with no other file needing to change.
-- Admin access (coalesce(public.is_admin(), false) in the OR branch) is
-- untouched - admins remain unaffected by purchase/expiry entirely, as
-- today.
begin;

create or replace function public.can_access_meditation(p_object_name text)
returns boolean language sql stable security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and (
    coalesce(public.is_admin(), false) or exists (
      select 1 from public.courses c
      join public.course_purchases cp on cp.course_id = c.id
      where c.content_type = 'audio' and c.audio_path = p_object_name
        and c.is_active = true and cp.user_id = auth.uid() and cp.status = 'paid'
        and cp.paid_at is not null and cp.paid_at + interval '7 days' > now()
    )
  );
$$;
revoke all on function public.can_access_meditation(text) from public;
grant execute on function public.can_access_meditation(text) to anon, authenticated;

-- New, read-only helper so the UI can show "confirmed on X, access until Y,
-- N days left" without re-deriving the expiry math (or the purchase lookup
-- itself) in application code. Returns the caller's own most recent paid
-- purchase for this course, or zero rows if they've never had one
-- confirmed - the page tells "never purchased" apart from "purchased but
-- expired" by whether this returns a row at all, separately from whether
-- is_access_active is true.
create or replace function public.get_meditation_access_status(p_course_id uuid)
returns table (
  purchase_id uuid,
  paid_at timestamptz,
  access_expires_at timestamptz,
  is_access_active boolean
)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select
    cp.id,
    cp.paid_at,
    cp.paid_at + interval '7 days',
    (cp.paid_at + interval '7 days' > now())
  from public.course_purchases cp
  where cp.course_id = p_course_id and cp.user_id = auth.uid()
    and cp.status = 'paid' and cp.paid_at is not null
  order by cp.paid_at desc
  limit 1;
$$;
revoke all on function public.get_meditation_access_status(uuid) from public, anon;
grant execute on function public.get_meditation_access_status(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;

-- Test (as the purchaser, paid_at within the last 7 days):
--   select * from get_meditation_access_status('<course id>');
--   -- one row, is_access_active = true
--   select get_meditation_audio_path('<course id>'); -- returns the real path
-- Test (as admin, manually set a throwaway test purchase's paid_at to
--   8 days ago - never do this to a real customer's row):
--   select * from get_meditation_access_status('<course id>');
--   -- still returns the row, is_access_active = false
--   select get_meditation_audio_path('<course id>'); -- returns null
--   -- a request against the storage object directly (fresh request, not an
--   -- already-issued signed URL) is denied by the restrictive storage policy
-- Test (as a different user who never purchased this course):
--   get_meditation_access_status returns zero rows; get_meditation_audio_path
--   returns null - identical to before this change.
-- Test (as admin, no purchase at all): get_meditation_audio_path still
--   returns the real path - unaffected, admins bypass this check entirely.

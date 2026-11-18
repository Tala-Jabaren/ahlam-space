-- Class packages (باقات): class_packages, package_purchases, and
-- classes.package_eligible.
--
-- REVIEW AND RUN MANUALLY in the Supabase SQL editor as postgres. Written to
-- run once; re-running is safe where noted (every object uses IF NOT
-- EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS), except the two seed
-- INSERTs and the package_eligible backfill, which are themselves guarded
-- to be no-ops on a second run (see sections 4 and 3).
--
-- Do NOT set the app's PACKAGES_ENABLED env var until after this file has
-- been run and reviewed live - the app code that reads class_packages /
-- package_purchases / classes.package_eligible / purchase payment_method is
-- entirely gated behind that flag and does not touch any of it while the
-- flag is off, regardless of whether this file has been run yet.
--
-- REUSES (does not duplicate):
--   public.generate_payment_reference() - defined in admin-payments.sql
--     section 1, already backing bookings.reference / course_purchases.reference
--     / orders.reference. package_purchases.reference uses the exact same
--     function as its column DEFAULT, so references stay one global AS-####
--     sequence across every payable table, not a second counter.
--   public.is_admin() - defined in admin-payments.sql section 2.
--   src/lib/bank-details.ts / src/components/payment-confirmation-block.tsx
--     for the bank-transfer instructions shown after a purchase - nothing
--     new to add on that side, the app reuses PaymentConfirmationBlock as-is.
--
-- =============================================================================
-- ROLLBACK (keep this up to date; run manually if this needs to be undone -
-- safe to run even if only part of the file below was applied, since every
-- statement here is also an IF EXISTS):
-- =============================================================================
--
-- begin;
-- revoke execute on function public.create_package_purchase(uuid, uuid) from authenticated;
-- revoke execute on function public.admin_confirm_package_purchase(uuid, text) from authenticated;
-- drop function if exists public.create_package_purchase(uuid, uuid);
-- drop function if exists public.admin_confirm_package_purchase(uuid, text);
-- drop table if exists public.package_purchases;
-- drop table if exists public.class_packages;
-- alter table public.classes drop column if exists package_eligible;
-- notify pgrst, 'reload schema';
-- commit;
--
-- =============================================================================
-- PRE-FLIGHT (read-only - run these first and review the output):
-- =============================================================================
--
-- (a) Confirm the reused functions already exist (both from admin-payments.sql,
-- which must already be applied before this file - if either of these
-- returns no rows, stop and run admin-payments.sql first):
-- select proname from pg_proc where proname in ('generate_payment_reference', 'is_admin');
--
-- (b) Confirm the Mix class id this file backfills package_eligible = false
-- for still exists and is named as expected (prevents silently backfilling
-- the wrong row, or none, if that class was ever deleted/renamed):
-- select id, name from public.classes where id = '538c29c1-105e-4a86-905b-864fba7da936';
--
-- (c) Confirm no class_packages/package_purchases objects already exist
-- under different definitions (should return no rows on a first run):
-- select table_name from information_schema.tables
-- where table_schema = 'public' and table_name in ('class_packages', 'package_purchases');

begin;

-- =============================================================================
-- 1. class_packages
-- =============================================================================

create table if not exists public.class_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  sessions_count integer not null check (sessions_count > 0),
  price numeric(10, 2) not null check (price >= 0),
  validity_days integer,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.class_packages enable row level security;

drop policy if exists "Public can view active packages" on public.class_packages;
create policy "Public can view active packages" on public.class_packages
  for select to anon, authenticated using (is_active = true);

drop policy if exists "Admins can manage packages" on public.class_packages;
create policy "Admins can manage packages" on public.class_packages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Table-level grant only - INSERT/UPDATE/DELETE are reached only through
-- the "Admins can manage packages" RLS policy above, same model
-- bookings/orders already use (no separate write grant needed; the admin
-- UI writes through plain .update()/.insert() calls that RLS gates, not a
-- SECURITY DEFINER RPC, since there's no cross-table invariant to protect
-- here the way there is for purchases below).
grant select, insert, update on public.class_packages to authenticated;
grant select on public.class_packages to anon;

-- =============================================================================
-- 2. package_purchases
-- =============================================================================

create table if not exists public.package_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  package_id uuid not null references public.class_packages(id),
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  reference text not null unique default public.generate_payment_reference(),
  -- Snapshotted from class_packages at purchase time (section 5) so a later
  -- edit to a package's price or session count never changes a purchase
  -- already made against the old values.
  price_snapshot numeric(10, 2) not null,
  sessions_total integer not null,
  sessions_remaining integer not null default 0,
  payment_method text check (payment_method in ('bank_transfer', 'studio')),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  expires_at timestamptz
);

alter table public.package_purchases enable row level security;

drop policy if exists "Members can view their own package purchases" on public.package_purchases;
create policy "Members can view their own package purchases" on public.package_purchases
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "Admins can view all package purchases" on public.package_purchases;
create policy "Admins can view all package purchases" on public.package_purchases
  for select to authenticated using (public.is_admin());

drop policy if exists "Admins can update package purchases" on public.package_purchases;
create policy "Admins can update package purchases" on public.package_purchases
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- No INSERT policy for authenticated at all, and no INSERT/UPDATE grant
-- below - every row is created by create_package_purchase and confirmed by
-- admin_confirm_package_purchase (sections 5-6), both SECURITY DEFINER, so
-- a client can never insert a purchase directly or forge its own
-- status/sessions_remaining/payment_method, the same closed-write model
-- bookings/orders already use (see admin-payments.sql section 9's note on
-- why those two tables need no enforce-on-insert trigger either).
grant select on public.package_purchases to authenticated;
grant update on public.package_purchases to authenticated;

-- =============================================================================
-- 3. classes.package_eligible
-- =============================================================================

alter table public.classes
  add column if not exists package_eligible boolean not null default true;

-- Backfill: the Wednesday "Mix" class doesn't take package credit. Guarded
-- so re-running this file is a no-op here (already false), and so a
-- missing/renamed id fails loudly instead of silently backfilling nothing -
-- see pre-flight (b) above to check this id first.
update public.classes
  set package_eligible = false
  where id = '538c29c1-105e-4a86-905b-864fba7da936';

do $$
begin
  if not exists (
    select 1 from public.classes
    where id = '538c29c1-105e-4a86-905b-864fba7da936'
      and package_eligible = false
  ) then
    raise exception 'PACKAGE_ELIGIBLE_BACKFILL_MISMATCH';
  end if;
end;
$$;

-- =============================================================================
-- 4. Seed packages - idempotent: only inserts a row if no package with that
--    exact name already exists, so re-running this file never duplicates
--    them (and never resets an admin's later edits to these same rows).
--    Single-class price is untouched (still 60 ₪, set in the app, not
--    here) - these are only the two starter packages.
-- =============================================================================

insert into public.class_packages (name, description, sessions_count, price, validity_days, is_active, sort_order)
select 'باقة 3 حصص', 'ثلاث حصص ضمن الباقة، صالحة لمدة شهر من تأكيد الدفع.', 3, 150, 30, true, 1
where not exists (select 1 from public.class_packages where name = 'باقة 3 حصص');

insert into public.class_packages (name, description, sessions_count, price, validity_days, is_active, sort_order)
select 'باقة 6 حصص', 'ست حصص ضمن الباقة، صالحة لمدة شهر من تأكيد الدفع.', 6, 300, 30, true, 2
where not exists (select 1 from public.class_packages where name = 'باقة 6 حصص');

-- =============================================================================
-- 5. create_package_purchase(p_package_id, p_user_id)
-- =============================================================================
--
-- Mirrors place_order/book_class_session's shape: caller must be the
-- purchasing user themselves (no admin-on-behalf-of here, same as those
-- two), and the row is created pending/unpaid with no session credit at
-- all - sessions_remaining stays 0 until admin_confirm_package_purchase
-- (section 6) runs. "No credit until confirmed" happens by construction,
-- not by a separate check anywhere else in the app.

create or replace function public.create_package_purchase(
  p_package_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_price numeric(10, 2);
  v_sessions_count integer;
  v_is_active boolean;
  v_purchase_id uuid;
  v_reference text;
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'FORBIDDEN';
  end if;

  select price, sessions_count, is_active
    into v_price, v_sessions_count, v_is_active
  from public.class_packages
  where id = p_package_id
  for share;

  if not found then
    raise exception 'PACKAGE_NOT_FOUND';
  end if;
  if v_is_active is not true then
    raise exception 'PACKAGE_UNAVAILABLE';
  end if;

  insert into public.package_purchases (
    user_id, package_id, status, price_snapshot, sessions_total, sessions_remaining
  )
  values (
    p_user_id, p_package_id, 'pending', v_price, v_sessions_count, 0
  )
  returning id, reference into v_purchase_id, v_reference;

  return jsonb_build_object('id', v_purchase_id, 'reference', v_reference);
end;
$$;

revoke all on function public.create_package_purchase(uuid, uuid) from public, anon;
grant execute on function public.create_package_purchase(uuid, uuid) to authenticated;
-- Test (as a logged-in member, p_user_id = your own id): expect
--   { id, reference: 'AS-####' }; the new row has status='pending',
--   sessions_remaining=0, payment_method=null, paid_at=null.
-- Test (p_user_id set to someone else's id): expect FORBIDDEN.
-- Test (p_package_id for an inactive or nonexistent package): expect
--   PACKAGE_UNAVAILABLE / PACKAGE_NOT_FOUND.

-- =============================================================================
-- 6. admin_confirm_package_purchase(p_purchase_id, p_payment_method)
-- =============================================================================
--
-- Deliberately a separate function from admin_confirm_payment (not a new
-- 'package' branch there): confirming a package is the one payable kind
-- where the admin herself records HOW it was paid (bank transfer vs in
-- person at the studio) at confirmation time, not something decided at
-- purchase time the way bookings/orders/courses already fix payment_method
-- to 'bank_transfer' up front - admin_confirm_payment's signature has
-- nowhere to take that extra input without changing its contract for the
-- three kinds that already call it.
--
-- expires_at uses the package's CURRENT validity_days, looked up at
-- confirmation time, not snapshotted at purchase time - sessions_total and
-- price_snapshot are the two values the task asked to snapshot (section 2);
-- validity_days isn't one of them, so an admin editing a package's validity
-- window does affect any purchase not yet confirmed, same as it would for
-- a brand new purchase made after the edit. A package with validity_days
-- left null never expires (expires_at stays null).

create or replace function public.admin_confirm_package_purchase(
  p_purchase_id uuid,
  p_payment_method text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_validity_days integer;
  v_updated_count integer;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  if p_payment_method is null or p_payment_method not in ('bank_transfer', 'studio') then
    raise exception 'INVALID_PAYMENT_METHOD';
  end if;

  select cp.validity_days
    into v_validity_days
  from public.package_purchases as pp
  join public.class_packages as cp on cp.id = pp.package_id
  where pp.id = p_purchase_id
  for update of pp;

  if not found then
    raise exception 'NOT_FOUND_OR_ALREADY_PROCESSED';
  end if;

  update public.package_purchases
    set status = 'paid',
        paid_at = now(),
        payment_method = p_payment_method,
        sessions_remaining = sessions_total,
        expires_at = case
          when v_validity_days is null then null
          else now() + make_interval(days => v_validity_days)
        end
    where id = p_purchase_id
      and paid_at is null
      and status <> 'cancelled';
  get diagnostics v_updated_count = row_count;

  if v_updated_count = 0 then
    raise exception 'NOT_FOUND_OR_ALREADY_PROCESSED';
  end if;
end;
$$;

revoke all on function public.admin_confirm_package_purchase(uuid, text) from public, anon;
grant execute on function public.admin_confirm_package_purchase(uuid, text) to authenticated;
-- Test (as admin, p_payment_method = 'bank_transfer' or 'studio'): expect
--   success; the purchase's status -> 'paid', sessions_remaining ==
--   sessions_total, expires_at == now() + the package's validity_days (or
--   null if the package has none).
-- Test (call it again on the same now-paid purchase): expect
--   NOT_FOUND_OR_ALREADY_PROCESSED (paid_at stays unchanged, not re-set).
-- Test (as non-admin authenticated user): expect FORBIDDEN.
-- Test (p_payment_method anything other than 'bank_transfer'/'studio'):
--   expect INVALID_PAYMENT_METHOD.
-- Test (p_payment_method = null): expect INVALID_PAYMENT_METHOD.

-- Make all of the above visible to PostgREST immediately.
notify pgrst, 'reload schema';

commit;

-- =============================================================================
-- UI reference - exact function names and params to call from the app
-- =============================================================================
--
-- create_package_purchase(p_package_id, p_user_id)
--   supabase.rpc('create_package_purchase', { p_package_id: uuid, p_user_id: uuid })
--   -> { id: uuid, reference: string }
--   errors: FORBIDDEN, PACKAGE_NOT_FOUND, PACKAGE_UNAVAILABLE
--
-- admin_confirm_package_purchase(p_purchase_id, p_payment_method)
--   supabase.rpc('admin_confirm_package_purchase', {
--     p_purchase_id: uuid, p_payment_method: 'bank_transfer' | 'studio'
--   })
--   errors: FORBIDDEN, INVALID_PAYMENT_METHOD, NOT_FOUND_OR_ALREADY_PROCESSED
--
-- class_packages / package_purchases reads are plain .from(...).select(...)
-- calls, protected by RLS above - no RPC needed for either.

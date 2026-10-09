-- Admin payments infrastructure: bank-transfer-only payments, payment
-- references, and admin confirm/cancel/expire tooling.
--
-- Review this file before running it manually in the Supabase SQL editor.
-- It is intentionally NOT an automatic migration. Run it top to bottom in a
-- single session; it is written to be safely re-runnable (every object uses
-- IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS).
--
-- SOURCE OF TRUTH: public.place_order lives ONLY in this file (section 7).
-- The place-order-function*.sql files that used to sit at the repo root
-- (v1-v4) have been deleted - do not recreate them; edit this file instead
-- and re-run it.
--
-- Real schema this was written against (verified live, not assumed):
--   bookings(id, session_id, user_id, status, payment_status, reserved_until,
--            created_at, payment_method)
--   course_purchases(id, course_id, user_id, status, payment_method, created_at)
--   orders(id, user_id [nullable], status, fulfillment_method, total,
--          created_at, payment_method, delivery_address, guest_name,
--          guest_phone, guest_email)
--   order_items(id, order_id, variant_id, quantity, unit_price)
--   session_requests(id, session_type, full_name, phone, email, message,
--                     status, created_at)
--   products(id, name, description, price, is_active, created_at, image_url)
--   product_variants(id, product_id, size, color, stock, sku)
--   profiles(id, full_name, phone, role, created_at)  -- role already has 'admin'
--
-- Existing functions this builds on:
--   book_class_session(p_session_id, p_user_id) - REPLACED by section 8 below
--     (new hold window + expired-hold cleanup; see that section for the
--     confirmed-live behavior it replaces)
--   confirm_pending_booking(p_booking_id) - unchanged
--   place_order(p_user_id, p_items, p_fulfillment_method, p_payment_method,
--               p_delivery_address, p_guest_name, p_guest_phone, p_guest_email)
--     -- v3 confirmed live; replaced by the v4 overload in section 7

begin;

-- =============================================================================
-- 1. SCHEMA: reference codes + paid_at timestamps on the three payable tables
-- =============================================================================

create sequence if not exists public.payment_reference_seq start with 1000;

create or replace function public.generate_payment_reference()
returns text
language sql
as $$
  select 'AS-' || nextval('public.payment_reference_seq')::text;
$$;
-- Test: select public.generate_payment_reference(); -- expect 'AS-1000', 'AS-1001', ...

-- Each ADD CONSTRAINT below is wrapped in a DO block that checks
-- pg_constraint first, since Postgres has no "ADD CONSTRAINT IF NOT
-- EXISTS" for unique constraints - without this guard, re-running this
-- file a second time would fail here on "constraint already exists".

alter table public.bookings
  add column if not exists reference text,
  add column if not exists paid_at timestamptz;
alter table public.bookings
  alter column reference set default public.generate_payment_reference();
update public.bookings set reference = public.generate_payment_reference()
  where reference is null;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_reference_unique'
  ) then
    alter table public.bookings
      add constraint bookings_reference_unique unique (reference);
  end if;
end;
$$;

alter table public.course_purchases
  add column if not exists reference text,
  add column if not exists paid_at timestamptz;
alter table public.course_purchases
  alter column reference set default public.generate_payment_reference();
update public.course_purchases set reference = public.generate_payment_reference()
  where reference is null;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'course_purchases_reference_unique'
  ) then
    alter table public.course_purchases
      add constraint course_purchases_reference_unique unique (reference);
  end if;
end;
$$;

alter table public.orders
  add column if not exists reference text,
  add column if not exists paid_at timestamptz;
alter table public.orders
  alter column reference set default public.generate_payment_reference();
update public.orders set reference = public.generate_payment_reference()
  where reference is null;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_reference_unique'
  ) then
    alter table public.orders
      add constraint orders_reference_unique unique (reference);
  end if;
end;
$$;

-- =============================================================================
-- 2. is_admin()
-- =============================================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;
-- Test (as an authenticated admin, via supabase.rpc('is_admin')): expect true.
-- Test (as a non-admin or anon): expect false, not an error.

-- =============================================================================
-- 3. RLS: admin SELECT + UPDATE on the 8 named tables, nothing loosened for
--    non-admins. ENABLE ROW LEVEL SECURITY is idempotent (safe to re-run even
--    if already on). For products/product_variants/profiles, a defensive
--    public/own-row read policy is added alongside the admin policy so that
--    if RLS was not already enabled on these, turning it on here does not
--    silently break existing public shop browsing or profile reads - if a
--    same-purpose policy already exists under a different name, this is a
--    harmless, redundant, equally-permissive addition (RLS policies are OR'd).
-- =============================================================================

alter table public.bookings enable row level security;
drop policy if exists "Admins can view all bookings" on public.bookings;
create policy "Admins can view all bookings" on public.bookings
  for select to authenticated using (public.is_admin());
drop policy if exists "Admins can update all bookings" on public.bookings;
create policy "Admins can update all bookings" on public.bookings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.course_purchases enable row level security;
drop policy if exists "Admins can view all course purchases" on public.course_purchases;
create policy "Admins can view all course purchases" on public.course_purchases
  for select to authenticated using (public.is_admin());
drop policy if exists "Admins can update all course purchases" on public.course_purchases;
create policy "Admins can update all course purchases" on public.course_purchases
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.orders enable row level security;
drop policy if exists "Admins can view all orders" on public.orders;
create policy "Admins can view all orders" on public.orders
  for select to authenticated using (public.is_admin());
drop policy if exists "Admins can update all orders" on public.orders;
create policy "Admins can update all orders" on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.order_items enable row level security;
drop policy if exists "Admins can view all order items" on public.order_items;
create policy "Admins can view all order items" on public.order_items
  for select to authenticated using (public.is_admin());
drop policy if exists "Admins can update all order items" on public.order_items;
create policy "Admins can update all order items" on public.order_items
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.session_requests enable row level security;
drop policy if exists "Admins can view all session requests" on public.session_requests;
create policy "Admins can view all session requests" on public.session_requests
  for select to authenticated using (public.is_admin());
drop policy if exists "Admins can update all session requests" on public.session_requests;
create policy "Admins can update all session requests" on public.session_requests
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.products enable row level security;
drop policy if exists "Public can view active products" on public.products;
create policy "Public can view active products" on public.products
  for select to anon, authenticated using (is_active = true);
drop policy if exists "Admins can view all products" on public.products;
create policy "Admins can view all products" on public.products
  for select to authenticated using (public.is_admin());
drop policy if exists "Admins can update all products" on public.products;
create policy "Admins can update all products" on public.products
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.product_variants enable row level security;
drop policy if exists "Public can view product variants" on public.product_variants;
create policy "Public can view product variants" on public.product_variants
  for select to anon, authenticated using (true);
drop policy if exists "Admins can view all product variants" on public.product_variants;
create policy "Admins can view all product variants" on public.product_variants
  for select to authenticated using (public.is_admin());
drop policy if exists "Admins can update all product variants" on public.product_variants;
create policy "Admins can update all product variants" on public.product_variants
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.profiles enable row level security;
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select to authenticated using (id = auth.uid());
drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles" on public.profiles
  for select to authenticated using (public.is_admin());
drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- =============================================================================
-- 4. admin_confirm_payment(p_kind, p_id)
-- =============================================================================

create or replace function public.admin_confirm_payment(p_kind text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_booking_status text;
  v_reserved_until timestamptz;
  v_session_id uuid;
  v_updated_count integer;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  if p_kind = 'booking' then
    select status, reserved_until, session_id
      into v_booking_status, v_reserved_until, v_session_id
    from public.bookings
    where id = p_id
    for update;

    if not found or v_booking_status = 'cancelled' then
      raise exception 'NOT_FOUND_OR_ALREADY_PROCESSED';
    end if;

    if v_reserved_until is not null and v_reserved_until < now() then
      -- The hold had already lapsed. Before honoring a late payment,
      -- re-verify under lock that the session genuinely still has room -
      -- normal booking flow can never let booked_count exceed capacity,
      -- but an admin editing a session's capacity downward after this
      -- hold was placed could make it so. If that's happened, don't
      -- confirm into an oversold class.
      perform 1 from public.class_sessions
        where id = v_session_id and booked_count > capacity
        for update;

      if found then
        raise exception 'SESSION_FULL';
      end if;
    end if;

    -- Same update shape/idempotency pattern as confirm_pending_booking, but
    -- callable by an admin regardless of whose booking it is (that function's
    -- own "user_id = auth.uid()" check is specific to self-service auto-confirm
    -- and doesn't apply here).
    update public.bookings
      set status = 'confirmed', payment_status = 'paid', paid_at = now()
      where id = p_id and paid_at is null and status <> 'cancelled';
    get diagnostics v_updated_count = row_count;

    if v_updated_count = 0 then
      raise exception 'NOT_FOUND_OR_ALREADY_PROCESSED';
    end if;
  elsif p_kind = 'course' then
    update public.course_purchases
      set status = 'paid', paid_at = now()
      where id = p_id and paid_at is null;
    get diagnostics v_updated_count = row_count;

    if v_updated_count = 0 then
      raise exception 'NOT_FOUND_OR_ALREADY_PROCESSED';
    end if;
  elsif p_kind = 'order' then
    update public.orders
      set status = 'paid', paid_at = now()
      where id = p_id and paid_at is null and status <> 'cancelled';
    get diagnostics v_updated_count = row_count;

    if v_updated_count = 0 then
      raise exception 'NOT_FOUND_OR_ALREADY_PROCESSED';
    end if;
  else
    raise exception 'INVALID_KIND:%', p_kind;
  end if;
end;
$$;

revoke all on function public.admin_confirm_payment(text, uuid) from public, anon;
grant execute on function public.admin_confirm_payment(text, uuid) to authenticated;
-- Test (as admin): select admin_confirm_payment('booking', '<a pending booking id>');
--   then re-run the same call - second call must raise
--   NOT_FOUND_OR_ALREADY_PROCESSED (paid_at stays unchanged).
-- Test (as non-admin authenticated user): expect FORBIDDEN.
-- Test (p_id that doesn't exist, or a cancelled booking/order):
--   expect NOT_FOUND_OR_ALREADY_PROCESSED.
-- Test (a booking whose reserved_until has passed, on a session where
--   capacity was since reduced below booked_count): expect SESSION_FULL.

-- =============================================================================
-- 5. admin_cancel_order(p_order_id) - unpaid/pending orders only, restores
--    stock exactly once
-- =============================================================================

-- Internal helper, not exposed over the API (no grant to anon/authenticated
-- below) - only callable from other SECURITY DEFINER functions in this file.
create or replace function public.restore_order_stock(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item record;
begin
  for v_item in
    select oi.variant_id, oi.quantity
    from public.order_items as oi
    where oi.order_id = p_order_id
    order by oi.variant_id
  loop
    update public.product_variants
      set stock = stock + v_item.quantity
      where id = v_item.variant_id;
  end loop;
end;
$$;
revoke all on function public.restore_order_stock(uuid) from public, anon, authenticated;

create or replace function public.admin_cancel_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cancelled_id uuid;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  -- Lock the order row first, then the variant rows the order references, in
  -- a stable order, before mutating anything - mirrors place_order's own
  -- locking discipline to avoid lock-order deadlocks with concurrent orders.
  perform 1 from public.orders where id = p_order_id for update;

  update public.orders
    set status = 'cancelled'
    where id = p_order_id and status = 'pending'
    returning id into v_cancelled_id;

  -- Only restore stock on the transition that actually cancels the order.
  -- A second call finds status already 'cancelled' (or 'paid'), updates
  -- nothing, and v_cancelled_id stays null - so stock is never restored twice.
  if v_cancelled_id is not null then
    perform pv.id
    from public.product_variants as pv
    join public.order_items as oi on oi.variant_id = pv.id
    where oi.order_id = p_order_id
    order by pv.id
    for update;

    perform public.restore_order_stock(p_order_id);
  end if;
end;
$$;

revoke all on function public.admin_cancel_order(uuid) from public, anon;
grant execute on function public.admin_cancel_order(uuid) to authenticated;
-- Test (as admin, on a pending order): select admin_cancel_order('<order id>');
--   check product_variants.stock increased by each line's quantity, and
--   orders.status = 'cancelled'.
-- Test idempotency: call it again with the same order id - stock must NOT
--   increase a second time.
-- Test (on an already-'paid' order): status must stay 'paid', not be
--   overwritten to 'cancelled'.

-- =============================================================================
-- 6. expire_unpaid_orders(p_hours default 48)
-- =============================================================================

-- Security note: this is callable two ways - (a) by an authenticated admin
-- through the API, where auth.uid() is set and must satisfy is_admin(); or
-- (b) directly inside the database (pg_cron, or the SQL editor), where there
-- is no JWT at all and auth.uid() is null. Case (b) is only reachable by
-- someone who already has direct database access - a strictly higher trust
-- bar than "is an app admin" - so it is allowed through. This does NOT open
-- the function to the anon API role: anon is never granted EXECUTE below, so
-- an anonymous REST call can't reach this function's body at all, regardless
-- of the auth.uid() check inside.
create or replace function public.expire_unpaid_orders(p_hours int default 48)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order record;
  v_count integer := 0;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  for v_order in
    select id from public.orders
    where status = 'pending'
      and created_at < now() - make_interval(hours => p_hours)
    order by id
    for update
  loop
    update public.orders set status = 'cancelled' where id = v_order.id;

    perform pv.id
    from public.product_variants as pv
    join public.order_items as oi on oi.variant_id = pv.id
    where oi.order_id = v_order.id
    order by pv.id
    for update;

    perform public.restore_order_stock(v_order.id);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.expire_unpaid_orders(int) from public, anon;
grant execute on function public.expire_unpaid_orders(int) to authenticated;
-- Test (as admin): select expire_unpaid_orders(0); -- 0 hours catches everything
--   pending right now; check returned count matches cancelled rows and stock
--   was restored. Use a throwaway pending test order, not real data.
-- Test (as non-admin authenticated user): expect FORBIDDEN.

-- Scheduled run via pg_cron - commented out on purpose. Uncomment and run
-- separately once pg_cron is confirmed enabled for this project
-- (Database > Extensions > pg_cron in the Supabase dashboard).
--
-- select cron.schedule(
--   'expire-unpaid-orders-hourly',
--   '0 * * * *',  -- top of every hour
--   $$ select public.expire_unpaid_orders(48); $$
-- );
--
-- To remove the schedule later: select cron.unschedule('expire-unpaid-orders-hourly');

-- =============================================================================
-- 7. place_order v4: bank-transfer-only + guest-checkout abuse protection
--    (the v1/v2/v3 files in the repo root are left untouched)
-- =============================================================================

drop function if exists public.place_order(
  uuid, jsonb, text, text, text, text, text, text
);

create function public.place_order(
  p_user_id uuid,
  p_items jsonb,
  p_fulfillment_method text,
  p_payment_method text,
  p_delivery_address text default null,
  p_guest_name text default null,
  p_guest_phone text default null,
  p_guest_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item record;
  v_variant_id uuid;
  v_stock integer;
  v_unit_price numeric(10, 2);
  v_total numeric(10, 2) := 0;
  v_order_id uuid;
  v_validated_items jsonb := '[]'::jsonb;
  v_pending_count integer;
  v_max_quantity_per_item constant integer := 20;
  v_max_guest_pending_orders constant integer := 3;
begin
  if p_user_id is not null then
    if auth.uid() is null or auth.uid() <> p_user_id then
      raise exception 'FORBIDDEN';
    end if;
  elsif nullif(btrim(p_guest_name), '') is null
     or nullif(btrim(p_guest_phone), '') is null then
    raise exception 'GUEST_INFO_REQUIRED';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'INVALID_ITEMS';
  end if;

  if p_fulfillment_method is null
     or p_fulfillment_method not in ('delivery', 'pickup') then
    raise exception 'INVALID_FULFILLMENT_METHOD';
  end if;

  -- Bank transfer is the only payment method now.
  if p_payment_method is distinct from 'bank_transfer' then
    raise exception 'INVALID_PAYMENT_METHOD';
  end if;

  -- Guest-checkout abuse protection: cap pending guest orders per contact
  -- info in a rolling 24h window. Authenticated users are not rate-limited
  -- here - they're already identity-verified via auth.
  if p_user_id is null then
    select count(*) into v_pending_count
    from public.orders
    where user_id is null
      and status = 'pending'
      and created_at > now() - interval '24 hours'
      and (
        guest_phone = nullif(btrim(p_guest_phone), '')
        or (p_guest_email is not null and guest_email = nullif(btrim(p_guest_email), ''))
      );

    if v_pending_count >= v_max_guest_pending_orders then
      raise exception 'TOO_MANY_PENDING_ORDERS';
    end if;
  end if;

  -- Validate every submitted line before aggregating repeated variants for the
  -- stock check. Invalid UUID/integer representations also fail before writes.
  for v_item in
    select item.variant_id, item.quantity
    from jsonb_to_recordset(p_items) as item(
      variant_id uuid,
      quantity integer
    )
  loop
    if v_item.variant_id is null or v_item.quantity is null then
      raise exception 'INVALID_ITEMS';
    end if;

    if v_item.quantity <= 0 then
      raise exception 'INVALID_QUANTITY:%', v_item.variant_id;
    end if;

    if v_item.quantity > v_max_quantity_per_item then
      raise exception 'QUANTITY_LIMIT_EXCEEDED:%', v_item.variant_id;
    end if;
  end loop;

  -- Lock all relevant product rows first and in a stable order. FOR SHARE keeps
  -- current prices fixed while still allowing concurrent orders for the same
  -- product. Taking these locks before variant locks avoids lock-order cycles.
  perform p.id
  from public.products as p
  join (
    select distinct pv.product_id
    from public.product_variants as pv
    join (
      select (item.value ->> 'variant_id')::uuid as variant_id
      from jsonb_array_elements(p_items) as item(value)
    ) as requested on requested.variant_id = pv.id
  ) as requested_products on requested_products.product_id = p.id
  order by p.id
  for share of p;

  -- Aggregate repeated variant IDs and lock every variant in a stable order.
  -- No stock is changed until every requested variant passes validation.
  for v_item in
    select
      (item.value ->> 'variant_id')::uuid as variant_id,
      sum((item.value ->> 'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) as item(value)
    group by (item.value ->> 'variant_id')::uuid
    order by (item.value ->> 'variant_id')::uuid
  loop
    -- Requiring p.is_active here (not just a valid variant) means a
    -- deactivated product can't be ordered even if someone already had it
    -- in their cart - reuses OUT_OF_STOCK rather than a new error code,
    -- since from the buyer's point of view it's the same outcome: this
    -- item isn't available for purchase right now.
    select pv.id, pv.stock, p.price
      into v_variant_id, v_stock, v_unit_price
    from public.product_variants as pv
    join public.products as p on p.id = pv.product_id
    where pv.id = v_item.variant_id
      and p.is_active = true
    for update of pv;

    if not found or v_stock < v_item.quantity then
      raise exception 'OUT_OF_STOCK:%', v_item.variant_id;
    end if;

    v_total := v_total + (v_unit_price * v_item.quantity);
    v_validated_items := v_validated_items || jsonb_build_array(
      jsonb_build_object(
        'variant_id', v_item.variant_id,
        'quantity', v_item.quantity,
        'unit_price', v_unit_price
      )
    );
  end loop;

  insert into public.orders (
    user_id,
    status,
    fulfillment_method,
    payment_method,
    delivery_address,
    guest_name,
    guest_phone,
    guest_email,
    total
  )
  values (
    p_user_id,
    'pending',
    p_fulfillment_method,
    p_payment_method,
    p_delivery_address,
    nullif(btrim(p_guest_name), ''),
    nullif(btrim(p_guest_phone), ''),
    nullif(btrim(p_guest_email), ''),
    v_total
  )
  returning id into v_order_id;
  -- Note: orders.reference is populated automatically by its column DEFAULT
  -- (section 1 above) - nothing to do here.

  -- The variants and products remain locked until the transaction ends. Use
  -- the validated price snapshots so the order total and line prices match.
  for v_item in
    select item.variant_id, item.quantity, item.unit_price
    from jsonb_to_recordset(v_validated_items) as item(
      variant_id uuid,
      quantity integer,
      unit_price numeric(10, 2)
    )
    order by item.variant_id
  loop
    update public.product_variants
    set stock = stock - v_item.quantity
    where id = v_item.variant_id;
  end loop;

  -- Preserve one order_items row per original JSON array item, while using the
  -- server-validated price captured under lock rather than client input.
  insert into public.order_items (
    order_id,
    variant_id,
    quantity,
    unit_price
  )
  select
    v_order_id,
    requested.variant_id,
    requested.quantity,
    validated.unit_price
  from jsonb_to_recordset(p_items) as requested(
    variant_id uuid,
    quantity integer
  )
  join jsonb_to_recordset(v_validated_items) as validated(
    variant_id uuid,
    quantity integer,
    unit_price numeric(10, 2)
  ) on validated.variant_id = requested.variant_id;

  return jsonb_build_object(
    'id', v_order_id,
    'reference', (select reference from public.orders where id = v_order_id),
    'total', v_total
  );
end;
$$;

revoke all on function public.place_order(
  uuid, jsonb, text, text, text, text, text, text
) from public;
grant execute on function public.place_order(
  uuid, jsonb, text, text, text, text, text, text
) to authenticated, anon;

-- =============================================================================
-- 8. book_class_session: bank-transfer hold window + expired-hold cleanup
-- =============================================================================
--
-- Current behavior before this section (verified live, not assumed): every
-- booking gets a flat 15-minute hold ("reserved_until" = created_at + 15
-- minutes), set in the one INSERT at the bottom of the original
-- book_class_session. booked_count on class_sessions is incremented the
-- moment a booking is created (pending or not) and was NEVER decremented
-- anywhere - confirmed by checking live booking rows, where every
-- reserved_until was exactly 15 minutes after created_at, and there was no
-- function anywhere that reduced booked_count. So an abandoned pending
-- booking silently and permanently ate a seat forever.
--
-- New behavior: bank transfer needs real time to send and be confirmed, so
-- the hold is now 24 hours - but never later than 2 hours before the class
-- starts, since a hold that outlives the class itself is meaningless. If a
-- class is already less than 2 hours away, there's no safe window left for
-- a transfer to clear and an admin to confirm it before the class starts,
-- so the booking is rejected outright with TOO_LATE_FOR_BANK_TRANSFER
-- rather than being handed a hold it can never realistically complete in
-- time (the UI should tell the user to pay another way or contact the
-- studio directly for same-day bookings).
--
-- Session start is computed as (session_date + start_time) interpreted in
-- Asia/Jerusalem local time - this project formats booking/order times in
-- that zone elsewhere (see src/app/(member)/orders/page.tsx), so it's taken
-- as the studio's operating timezone here too.

-- Internal helper: cancels this session's pending bookings whose hold has
-- lapsed and gives their seats back. Not exposed over the API (no grant to
-- anon/authenticated below) - called from book_class_session (scoped to one
-- session, opportunistically, on every booking attempt) and from
-- expire_unpaid_bookings (scoped globally, for a scheduled/admin sweep).
-- Returns the number of bookings it expired.
create or replace function public.expire_stale_bookings_for_session(p_session_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_expired_count integer;
begin
  update public.bookings
    set status = 'cancelled'
    where session_id = p_session_id
      and status = 'pending'
      and reserved_until < now();
  get diagnostics v_expired_count = row_count;

  if v_expired_count > 0 then
    update public.class_sessions
      set booked_count = greatest(0, booked_count - v_expired_count)
      where id = p_session_id;
  end if;

  return v_expired_count;
end;
$$;
revoke all on function public.expire_stale_bookings_for_session(uuid)
  from public, anon, authenticated;

create or replace function public.book_class_session(p_session_id uuid, p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_booking_id uuid;
  v_session_date date;
  v_start_time time;
  v_class_start timestamptz;
  v_hold_until timestamptz;
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'FORBIDDEN';
  end if;

  perform 1 from class_sessions
    where id = p_session_id
    for update;

  -- Release any pending holds on this session whose window has already
  -- passed, so they stop occupying a seat before capacity is checked below.
  perform public.expire_stale_bookings_for_session(p_session_id);

  select session_date, start_time into v_session_date, v_start_time
  from class_sessions
  where id = p_session_id;

  if not found then
    raise exception 'SESSION_FULL_OR_UNAVAILABLE';
  end if;

  v_class_start := (v_session_date + v_start_time) at time zone 'Asia/Jerusalem';

  if v_class_start - interval '2 hours' <= now() then
    raise exception 'TOO_LATE_FOR_BANK_TRANSFER';
  end if;

  v_hold_until := least(now() + interval '24 hours', v_class_start - interval '2 hours');

  update class_sessions
    set booked_count = booked_count + 1
    where id = p_session_id
      and booked_count < capacity
      and status = 'scheduled';

  if not found then
    raise exception 'SESSION_FULL_OR_UNAVAILABLE';
  end if;

  insert into bookings (session_id, user_id, status, reserved_until, payment_method)
  values (p_session_id, p_user_id, 'pending', v_hold_until, 'bank_transfer')
  returning id into v_booking_id;

  return v_booking_id;
end;
$$;
-- Test (book a session >2h out): expect success, reserved_until =
--   min(now()+24h, class_start-2h) - for a class far in the future, that's
--   roughly 24h from now; for one 3h away, roughly 1h from now.
-- Test (book a session <2h out, or already started): expect
--   TOO_LATE_FOR_BANK_TRANSFER.
-- Test (manually set an existing pending booking's reserved_until to the
--   past, then book that same session again): the first booking should
--   flip to 'cancelled' and the session's booked_count should drop by 1
--   before the new booking is counted.

-- Global sweep, for an admin-triggered manual run or a pg_cron schedule -
-- same security model as expire_unpaid_orders (see section 6): admins via
-- the API, or direct database access (pg_cron/SQL editor) where auth.uid()
-- is null. anon is never granted EXECUTE, so the anonymous API role can't
-- reach this regardless of the auth.uid() check inside.
create or replace function public.expire_unpaid_bookings()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session_id uuid;
  v_total integer := 0;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  for v_session_id in
    select distinct b.session_id
    from public.bookings as b
    where b.status = 'pending' and b.reserved_until < now()
    order by b.session_id
  loop
    perform 1 from public.class_sessions where id = v_session_id for update;
    v_total := v_total + public.expire_stale_bookings_for_session(v_session_id);
  end loop;

  return v_total;
end;
$$;

revoke all on function public.expire_unpaid_bookings() from public, anon;
grant execute on function public.expire_unpaid_bookings() to authenticated;
-- Test (as admin, with a throwaway pending booking whose reserved_until you
--   backdate first): select expire_unpaid_bookings(); expect it in the
--   returned count, status = 'cancelled', and class_sessions.booked_count
--   reduced by 1.
-- Test (as non-admin authenticated user): expect FORBIDDEN.

-- Scheduled run via pg_cron - commented out on purpose, same as
-- expire_unpaid_orders above. Uncomment once pg_cron is confirmed enabled.
--
-- select cron.schedule(
--   'expire-unpaid-bookings-hourly',
--   '0 * * * *',
--   $$ select public.expire_unpaid_bookings(); $$
-- );

-- =============================================================================
-- 9. course_purchases: force payment_method = 'bank_transfer' server-side
-- =============================================================================
--
-- purchase-course-button.tsx inserts into course_purchases directly from the
-- client (not through a SECURITY DEFINER function like bookings/orders), and
-- currently always sends payment_method: 'bank_transfer' itself - but nothing
-- server-side enforced that. Per src/types/database.ts, payment_method is
-- nullable and optional on Insert with no default visible anywhere in this
-- repo's SQL, so an omitted or tampered value would otherwise fall through
-- to NULL or whatever the client sent. This trigger makes the server
-- authoritative instead of trusting the client-supplied value.

create or replace function public.enforce_course_purchase_payment_method()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.payment_method := 'bank_transfer';
  return new;
end;
$$;

drop trigger if exists course_purchases_force_payment_method on public.course_purchases;
create trigger course_purchases_force_payment_method
  before insert on public.course_purchases
  for each row
  execute function public.enforce_course_purchase_payment_method();
-- Test: insert a course_purchases row (as an authenticated user, via the API)
--   without a payment_method, or with any other value - the stored row must
--   end up with payment_method = 'bank_transfer' either way.

-- Make all of the above visible to PostgREST immediately.
notify pgrst, 'reload schema';

commit;

-- =============================================================================
-- UI reference - exact function names and params to call from the app
-- =============================================================================
--
-- is_admin()
--   supabase.rpc('is_admin')  -> boolean
--
-- admin_confirm_payment(p_kind, p_id)
--   supabase.rpc('admin_confirm_payment', { p_kind: 'booking' | 'course' | 'order', p_id: uuid })
--   errors: FORBIDDEN, INVALID_KIND:<kind>, NOT_FOUND_OR_ALREADY_PROCESSED
--   (not found, already paid, or a cancelled booking/order), SESSION_FULL
--   (booking only - hold had lapsed and the session no longer has room)
--
-- admin_cancel_order(p_order_id)
--   supabase.rpc('admin_cancel_order', { p_order_id: uuid })
--
-- expire_unpaid_orders(p_hours = 48)
--   supabase.rpc('expire_unpaid_orders', { p_hours: 48 })  -- admin-triggered manual run;
--   normally runs on its own via the pg_cron schedule above once uncommented
--
-- place_order (v4, same input shape as v3 the frontend already uses, just
-- payment_method is now always 'bank_transfer' - but the RETURN VALUE
-- changed from a bare uuid to jsonb, since guests have no RLS read access to
-- orders and need the reference code back without a follow-up SELECT)
--   supabase.rpc('place_order', {
--     p_user_id, p_items, p_fulfillment_method, p_payment_method: 'bank_transfer',
--     p_delivery_address, p_guest_name, p_guest_phone, p_guest_email
--   })
--   -> { id: uuid, reference: string, total: number }
--
-- book_class_session(p_session_id, p_user_id) - same call shape as before,
-- only the hold window and error set changed
--   supabase.rpc('book_class_session', { p_session_id: uuid, p_user_id: uuid })
--   -> uuid (booking id)
--   errors: FORBIDDEN, SESSION_FULL_OR_UNAVAILABLE, TOO_LATE_FOR_BANK_TRANSFER
--   (new - class starts in under 2 hours, no safe window left for a transfer
--   to clear and be confirmed in time)
--
-- expire_unpaid_bookings() - admin-triggered manual run, or via the
-- commented-out pg_cron schedule in section 8 once uncommented
--   supabase.rpc('expire_unpaid_bookings')  -> integer (bookings expired)
--
-- course_purchases.payment_method - always ends up 'bank_transfer' once
-- stored, enforced server-side by a BEFORE INSERT trigger (section 9). The
-- client's insert can still pass payment_method: 'bank_transfer' as before,
-- it's just no longer load-bearing.

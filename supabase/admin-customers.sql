-- Admin customers list: registered users and guest buyers, with order
-- totals, for the admin-only /admin/customers page and its CSV/DOCX export.
--
-- REVIEW AND RUN MANUALLY in the Supabase SQL editor. NOT run by Claude.
-- Written to be safely re-runnable (CREATE OR REPLACE, idempotent grants).
-- Does not widen any existing RLS policy - both functions are SECURITY
-- DEFINER and read public.profiles/public.orders/auth.users directly,
-- the same pattern as every other admin_* function in admin-payments.sql.
--
-- Schema verified against src/types/database.ts before writing this file:
--   profiles(id, full_name, phone, city, role, created_at) - no email column
--   orders(id, user_id [nullable], status, total, fulfillment_method,
--          created_at, guest_name, guest_phone, guest_email)
--   auth.users(id, email, ...) - Supabase's own table; a SECURITY DEFINER
--     function owned by a role with access to the auth schema (the normal
--     case for functions created via the Supabase SQL editor) can select
--     from it directly. If this raises a permission error for you, the
--     function's owner needs `grant usage on schema auth, select on
--     auth.users` - that's a one-time dashboard-side grant, not something
--     this file can do for you from inside itself.
--
-- Business rules used below (decided here, not explicitly re-stated in
-- the brief for the guest-buyers function, but kept identical to the
-- user-list function for consistency - same field names should mean the
-- same thing in both):
--   orders_count   = count of orders where status <> 'cancelled'
--   total_spent    = sum of orders.total where status in
--                    ('paid', 'processing', 'shipped', 'delivered')
--                    (i.e. money actually collected or in fulfillment -
--                    'pending' bank-transfer orders are not counted yet)
--   last_order_at  = most recent orders.created_at where status <> 'cancelled'
--
-- admin_list_customers() returns every row in public.profiles EXCEPT
-- admins (where coalesce(p.role, '') <> 'admin'), left-joined to their
-- order aggregates so a user with zero orders still gets a row
-- (counts/total 0, last_order_at null) instead of being dropped.

begin;

create or replace function public.admin_list_customers()
returns table (
  user_id uuid,
  full_name text,
  email text,
  phone text,
  city text,
  registered_at timestamptz,
  orders_count integer,
  total_spent numeric,
  last_order_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  return query
  select
    p.id as user_id,
    p.full_name,
    u.email::text as email,
    p.phone,
    p.city,
    p.created_at as registered_at,
    coalesce(agg.orders_count, 0)::integer as orders_count,
    coalesce(agg.total_spent, 0)::numeric as total_spent,
    agg.last_order_at
  from public.profiles as p
  join auth.users as u on u.id = p.id
  left join (
    select
      o.user_id,
      count(*) filter (where o.status <> 'cancelled') as orders_count,
      sum(o.total) filter (
        where o.status in ('paid', 'processing', 'shipped', 'delivered')
      ) as total_spent,
      max(o.created_at) filter (where o.status <> 'cancelled') as last_order_at
    from public.orders as o
    where o.user_id is not null
    group by o.user_id
  ) as agg on agg.user_id = p.id
  where coalesce(p.role, '') <> 'admin'
  order by p.created_at desc;
end;
$$;

revoke all on function public.admin_list_customers() from public, anon;
grant execute on function public.admin_list_customers() to authenticated;
-- Test (as admin, via supabase.rpc('admin_list_customers')): one row per
--   profiles row, email populated from auth.users, counts/total correct
--   against a few known test orders.
-- Test (as non-admin authenticated user, or anon): expect an error with
--   code 42501 and message FORBIDDEN (select rpc error.code/.message
--   client-side to confirm, not just that it failed).

-- admin_list_guest_buyers(): guest orders (user_id is null) grouped by
-- guest_phone. guest_name/guest_email can vary slightly between orders for
-- the same phone number (nothing enforces identity consistency for guest
-- checkout) - this uses the most recent order's name/email per phone
-- group, which is what a "grouped by guest_phone" list most usefully shows.
-- A phone group whose orders are ALL cancelled (orders_count = 0) is
-- excluded entirely via "where coalesce(agg.orders_count, 0) > 0" - they
-- were never an actual buyer.
create or replace function public.admin_list_guest_buyers()
returns table (
  guest_name text,
  guest_phone text,
  guest_email text,
  orders_count integer,
  total_spent numeric,
  last_order_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  return query
  select
    latest.guest_name,
    latest.guest_phone,
    latest.guest_email,
    coalesce(agg.orders_count, 0)::integer as orders_count,
    coalesce(agg.total_spent, 0)::numeric as total_spent,
    agg.last_order_at
  from (
    select distinct on (o.guest_phone)
      o.guest_phone, o.guest_name, o.guest_email
    from public.orders as o
    where o.user_id is null
    order by o.guest_phone, o.created_at desc
  ) as latest
  left join (
    select
      o.guest_phone,
      count(*) filter (where o.status <> 'cancelled') as orders_count,
      sum(o.total) filter (
        where o.status in ('paid', 'processing', 'shipped', 'delivered')
      ) as total_spent,
      max(o.created_at) filter (where o.status <> 'cancelled') as last_order_at
    from public.orders as o
    where o.user_id is null
    group by o.guest_phone
  ) as agg on agg.guest_phone = latest.guest_phone
  where coalesce(agg.orders_count, 0) > 0
  order by agg.last_order_at desc nulls last;
end;
$$;

revoke all on function public.admin_list_guest_buyers() from public, anon;
grant execute on function public.admin_list_guest_buyers() to authenticated;
-- Test (as admin): one row per distinct guest_phone among guest orders
--   with at least one non-cancelled order, name/email matching that
--   phone's most recent order.
-- Test (a guest phone with only a cancelled order): excluded entirely -
--   does not appear in the results.
-- Test (as non-admin authenticated user, or anon): expect 42501/FORBIDDEN.

-- admin_get_customer_detail(p_user_id): one registered user's whole history
-- for the admin detail view - their profile (same shape/definitions as one
-- row of admin_list_customers(), computed directly for just this user
-- rather than calling that function and filtering), their orders (each with
-- its line items), their class bookings (with the class name and session
-- date/time), and their course purchases (with the course title). Returns
-- SQL null (not a JSON "null") when p_user_id isn't in public.profiles, so
-- the TypeScript layer can tell "no such user" apart from "user with no
-- history" (which still returns a real object with empty arrays).
--
-- Columns used here beyond the ones already verified above (also checked
-- against src/types/database.ts, and against the live schema comment at
-- the top of admin-payments.sql for reference/paid_at, which are newer
-- than database.ts's last regeneration but already confirmed live and in
-- use by src/app/(member)/orders/page.tsx, book-session-button.tsx, and
-- purchase-course-button.tsx):
--   bookings(id, session_id, user_id, status, payment_status, reference, created_at)
--   class_sessions(id, class_id, session_date, start_time, end_time)
--   classes(id, name)
--   course_purchases(id, course_id, user_id, status, paid_at, reference, created_at)
--   courses(id, title, price)
--   order_items(id, order_id, variant_id, quantity, unit_price)
--   product_variants(id, product_id, size, color)
--   products(id, name)
create or replace function public.admin_get_customer_detail(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile jsonb;
  v_orders jsonb;
  v_bookings jsonb;
  v_course_purchases jsonb;
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  select jsonb_build_object(
    'user_id', p.id,
    'full_name', p.full_name,
    'email', u.email,
    'phone', p.phone,
    'city', p.city,
    'registered_at', p.created_at,
    'orders_count', coalesce(agg.orders_count, 0),
    'total_spent', coalesce(agg.total_spent, 0),
    'last_order_at', agg.last_order_at
  )
  into v_profile
  from public.profiles as p
  join auth.users as u on u.id = p.id
  left join (
    select
      o.user_id,
      count(*) filter (where o.status <> 'cancelled') as orders_count,
      sum(o.total) filter (
        where o.status in ('paid', 'processing', 'shipped', 'delivered')
      ) as total_spent,
      max(o.created_at) filter (where o.status <> 'cancelled') as last_order_at
    from public.orders as o
    where o.user_id = p_user_id
    group by o.user_id
  ) as agg on agg.user_id = p.id
  where p.id = p_user_id;

  if v_profile is null then
    return null;
  end if;

  select coalesce(jsonb_agg(payload order by sort_key desc), '[]'::jsonb)
  into v_orders
  from (
    select
      o.created_at as sort_key,
      jsonb_build_object(
        'id', o.id,
        'reference', o.reference,
        'created_at', o.created_at,
        'status', o.status,
        'payment_method', o.payment_method,
        'fulfillment_method', o.fulfillment_method,
        'total', o.total,
        'delivery_address', o.delivery_address,
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
            'product_name', pr.name,
            'variant_label', nullif(concat_ws(' · ', pv.size, pv.color), ''),
            'quantity', oi.quantity,
            'unit_price', oi.unit_price
          ))
          from public.order_items as oi
          join public.product_variants as pv on pv.id = oi.variant_id
          join public.products as pr on pr.id = pv.product_id
          where oi.order_id = o.id
        ), '[]'::jsonb)
      ) as payload
    from public.orders as o
    where o.user_id = p_user_id
  ) as t;

  select coalesce(jsonb_agg(payload order by sort_key desc), '[]'::jsonb)
  into v_bookings
  from (
    select
      b.created_at as sort_key,
      jsonb_build_object(
        'id', b.id,
        'reference', b.reference,
        'created_at', b.created_at,
        'status', b.status,
        'payment_status', b.payment_status,
        'class_name', c.name,
        'session_date', cs.session_date,
        'start_time', cs.start_time,
        'end_time', cs.end_time
      ) as payload
    from public.bookings as b
    join public.class_sessions as cs on cs.id = b.session_id
    join public.classes as c on c.id = cs.class_id
    where b.user_id = p_user_id
  ) as t;

  select coalesce(jsonb_agg(payload order by sort_key desc), '[]'::jsonb)
  into v_course_purchases
  from (
    select
      cp.created_at as sort_key,
      jsonb_build_object(
        'id', cp.id,
        'reference', cp.reference,
        'created_at', cp.created_at,
        'status', cp.status,
        'paid_at', cp.paid_at,
        'course_title', co.title,
        'price', co.price
      ) as payload
    from public.course_purchases as cp
    join public.courses as co on co.id = cp.course_id
    where cp.user_id = p_user_id
  ) as t;

  return jsonb_build_object(
    'profile', v_profile,
    'orders', v_orders,
    'bookings', v_bookings,
    'course_purchases', v_course_purchases
  );
end;
$$;

revoke all on function public.admin_get_customer_detail(uuid) from public, anon;
grant execute on function public.admin_get_customer_detail(uuid) to authenticated;
-- Test (as admin, with a user who has at least one order/booking/course
--   purchase): one JSON object with all four keys populated, each list
--   newest first.
-- Test (as admin, with a user who has no history at all): profile populated,
--   orders/bookings/course_purchases all [].
-- Test (a user_id not in public.profiles): expect SQL null (supabase-js
--   surfaces this as data: null, error: null - not an error response).
-- Test (as non-admin authenticated user, or anon): expect 42501/FORBIDDEN.

-- admin_get_guest_detail(p_phone): a guest's orders (with items) by
-- guest_phone, for the admin detail view opened from the guest-buyers tab.
-- There's no separate "guest profile" row anywhere - a guest's identity is
-- entirely defined by having at least one order with that phone number, so
-- this returns SQL null when no such order exists, the same "not found"
-- signal admin_get_customer_detail uses.
create or replace function public.admin_get_guest_detail(p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_guest jsonb;
  v_orders jsonb;
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  select jsonb_build_object(
    'guest_name', latest.guest_name,
    'guest_phone', latest.guest_phone,
    'guest_email', latest.guest_email,
    'orders_count', coalesce(agg.orders_count, 0),
    'total_spent', coalesce(agg.total_spent, 0),
    'last_order_at', agg.last_order_at
  )
  into v_guest
  from (
    select guest_phone, guest_name, guest_email
    from public.orders
    where user_id is null and guest_phone = p_phone
    order by created_at desc
    limit 1
  ) as latest
  left join (
    select
      count(*) filter (where status <> 'cancelled') as orders_count,
      sum(total) filter (
        where status in ('paid', 'processing', 'shipped', 'delivered')
      ) as total_spent,
      max(created_at) filter (where status <> 'cancelled') as last_order_at
    from public.orders
    where user_id is null and guest_phone = p_phone
  ) as agg on true;

  if v_guest is null then
    return null;
  end if;

  select coalesce(jsonb_agg(payload order by sort_key desc), '[]'::jsonb)
  into v_orders
  from (
    select
      o.created_at as sort_key,
      jsonb_build_object(
        'id', o.id,
        'reference', o.reference,
        'created_at', o.created_at,
        'status', o.status,
        'payment_method', o.payment_method,
        'fulfillment_method', o.fulfillment_method,
        'total', o.total,
        'delivery_address', o.delivery_address,
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
            'product_name', pr.name,
            'variant_label', nullif(concat_ws(' · ', pv.size, pv.color), ''),
            'quantity', oi.quantity,
            'unit_price', oi.unit_price
          ))
          from public.order_items as oi
          join public.product_variants as pv on pv.id = oi.variant_id
          join public.products as pr on pr.id = pv.product_id
          where oi.order_id = o.id
        ), '[]'::jsonb)
      ) as payload
    from public.orders as o
    where o.user_id is null and o.guest_phone = p_phone
  ) as t;

  return jsonb_build_object('guest', v_guest, 'orders', v_orders);
end;
$$;

revoke all on function public.admin_get_guest_detail(text) from public, anon;
grant execute on function public.admin_get_guest_detail(text) to authenticated;
-- Test (as admin, with a phone number that has guest orders): one JSON
--   object with "guest" and "orders" (newest first, each with items).
-- Test (a phone number with no guest orders at all): expect SQL null.
-- Test (as non-admin authenticated user, or anon): expect 42501/FORBIDDEN.

-- Make all four functions visible to PostgREST immediately.
notify pgrst, 'reload schema';

commit;

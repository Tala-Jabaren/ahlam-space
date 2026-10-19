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
-- admin_list_customers() returns every row in public.profiles (including
-- admins themselves - the brief said "one row per registered user", not
-- "non-admin user"; if you want admins excluded from the list, say so and
-- this is a one-line change), left-joined to their order aggregates so a
-- user with zero orders still gets a row (counts/total 0, last_order_at
-- null) instead of being dropped.

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
  if auth.uid() is null or not public.is_admin() then
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
-- A phone group whose orders are ALL cancelled still gets a row (per
-- "orders with user_id null, grouped by guest_phone" - the grouping itself
-- isn't filtered by status, only the orders_count/total_spent/last_order_at
-- values are), with orders_count = 0 and last_order_at = null.
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
  if auth.uid() is null or not public.is_admin() then
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
  order by agg.last_order_at desc nulls last;
end;
$$;

revoke all on function public.admin_list_guest_buyers() from public, anon;
grant execute on function public.admin_list_guest_buyers() to authenticated;
-- Test (as admin): one row per distinct guest_phone among guest orders,
--   name/email matching that phone's most recent order.
-- Test (a guest phone with one cancelled-only order): still appears, with
--   orders_count = 0, total_spent = 0, last_order_at = null.
-- Test (as non-admin authenticated user, or anon): expect 42501/FORBIDDEN.

-- Make both functions visible to PostgREST immediately.
notify pgrst, 'reload schema';

commit;

-- Review this file before running it manually in the Supabase SQL editor.
-- This script is intentionally not included as an automatic migration.
--
-- v4 changes from v3: payment_method is restricted to 'bank_transfer' only
-- (the checkout UI no longer offers cash/card), guest checkout now has abuse
-- protection (max 3 pending guest orders per phone/email in a rolling 24h
-- window, and a 20-unit cap per line item that applies to everyone), and the
-- return value changed from a bare uuid to jsonb - { id, reference, total } -
-- since guests have no RLS read access to orders and need the reference code
-- back without a follow-up SELECT (which would silently return nothing).
--
-- This is the same function also included in supabase/admin-payments.sql -
-- kept here too as its own file to match the existing versioned-file
-- convention (place-order-function.sql, -v2.sql, -v3.sql are left untouched).
-- Only run this ONE place, not both.

begin;

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

  if p_payment_method is distinct from 'bank_transfer' then
    raise exception 'INVALID_PAYMENT_METHOD';
  end if;

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

  for v_item in
    select
      (item.value ->> 'variant_id')::uuid as variant_id,
      sum((item.value ->> 'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) as item(value)
    group by (item.value ->> 'variant_id')::uuid
    order by (item.value ->> 'variant_id')::uuid
  loop
    select pv.id, pv.stock, p.price
      into v_variant_id, v_stock, v_unit_price
    from public.product_variants as pv
    join public.products as p on p.id = pv.product_id
    where pv.id = v_item.variant_id
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

notify pgrst, 'reload schema';

commit;

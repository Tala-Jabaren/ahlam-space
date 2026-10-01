-- Review this file before running it manually in the Supabase SQL editor.
-- This script is intentionally not included as an automatic migration.
--
-- The old four-argument function must be removed because keeping it beside a
-- five-argument overload with a default value would make four-argument calls
-- ambiguous. The transaction restores the old function if any later step fails.

begin;

drop function if exists public.place_order(uuid, jsonb, text, text);

create function public.place_order(
  p_user_id uuid,
  p_items jsonb,
  p_fulfillment_method text,
  p_payment_method text,
  p_delivery_address text default null
)
returns uuid
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
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'FORBIDDEN';
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

  if p_payment_method is null
     or p_payment_method not in (
       'card_gateway',
       'bank_transfer',
       'cash_at_studio'
     ) then
    raise exception 'INVALID_PAYMENT_METHOD';
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
    total
  )
  values (
    p_user_id,
    'pending',
    p_fulfillment_method,
    p_payment_method,
    p_delivery_address,
    v_total
  )
  returning id into v_order_id;

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

  return v_order_id;
end;
$$;

revoke all on function public.place_order(uuid, jsonb, text, text, text)
from public;
revoke all on function public.place_order(uuid, jsonb, text, text, text)
from anon;
grant execute on function public.place_order(uuid, jsonb, text, text, text)
to authenticated;

-- Make the new five-argument signature visible to PostgREST immediately.
notify pgrst, 'reload schema';

commit;

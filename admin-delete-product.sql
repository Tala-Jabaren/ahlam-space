-- REVIEW ONLY: run manually in Supabase after reviewing this file.
-- No existing orders or order items are deleted or modified.
-- Requires the existing public.is_admin() function.

begin;

create or replace function public.admin_delete_product(p_product_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  -- Lock in the same product-then-variant order as place_order.
  perform p.id from public.products as p
  where p.id = p_product_id
  for update;

  if not found then
    raise exception 'PRODUCT_NOT_FOUND';
  end if;

  perform pv.id from public.product_variants as pv
  where pv.product_id = p_product_id
  order by pv.id
  for update;

  if exists (
    select 1
    from public.order_items as oi
    join public.product_variants as pv on pv.id = oi.variant_id
    where pv.product_id = p_product_id
  ) then
    raise exception 'PRODUCT_HAS_ORDERS';
  end if;

  -- Both deletes are part of the RPC transaction. Any error rolls back both.
  delete from public.product_variants where product_id = p_product_id;
  delete from public.products where id = p_product_id;

  return p_product_id;
end;
$$;

revoke all on function public.admin_delete_product(uuid) from public, anon;
grant execute on function public.admin_delete_product(uuid) to authenticated;

commit;

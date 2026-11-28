begin;

create or replace function public.cancel_pending_package_purchase(p_purchase_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  member_id uuid := auth.uid();
begin
  if member_id is null then
    return false;
  end if;

  -- The conditional UPDATE locks the row and rechecks its status after
  -- any concurrent admin payment confirmation.
  update public.package_purchases
  set status = 'cancelled'
  where id = p_purchase_id
    and user_id = member_id
    and status = 'pending'
    and paid_at is null;

  if found then
    return true;
  end if;

  return exists (
    select 1 from public.package_purchases
    where id = p_purchase_id and user_id = member_id
      and status = 'cancelled' and paid_at is null
  );
end;
$$;

revoke all on function public.cancel_pending_package_purchase(uuid) from public, anon;
grant execute on function public.cancel_pending_package_purchase(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;

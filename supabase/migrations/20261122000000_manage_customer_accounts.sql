begin;

create or replace function public.admin_list_customer_accounts()
returns table (
  user_id uuid, full_name text, email text, phone text, city text,
  registered_at timestamptz, orders_count integer, total_spent numeric,
  last_order_at timestamptz, account_disabled boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.*, coalesce(u.banned_until > now(), false)
  from public.admin_list_customers() c
  join auth.users u on u.id = c.user_id
  where u.deleted_at is null
  order by c.registered_at desc;
$$;

create or replace function public.admin_get_customer_account_state(p_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  return (
    select case when u.banned_until > now() then 'disabled' else 'active' end
    from auth.users u
    join public.profiles p on p.id = u.id
    where u.id = p_user_id and u.deleted_at is null and p.role = 'member'
  );
end;
$$;

revoke all on function public.admin_list_customer_accounts() from public, anon;
revoke all on function public.admin_get_customer_account_state(uuid) from public, anon;
grant execute on function public.admin_list_customer_accounts() to authenticated;
grant execute on function public.admin_get_customer_account_state(uuid) to authenticated;

-- The Auth API changes the account; the trigger keeps protections and
-- cleanup in its transaction, even if a promotion or delete races it.
create or replace function public.apply_customer_auth_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role text;
begin
  if new.banned_until is not distinct from old.banned_until
     and new.deleted_at is not distinct from old.deleted_at then
    return new;
  end if;

  select p.role into target_role from public.profiles p
  where p.id = old.id for no key update;

  if target_role = 'admin' then
    raise exception using errcode = '42501', message = 'ADMIN_ACCOUNT_PROTECTED';
  end if;

  if new.deleted_at is not null and old.deleted_at is null then
    update public.profiles set full_name = null, phone = null, city = null where id = old.id;
  end if;

  if new.banned_until > now() and old.banned_until is distinct from new.banned_until then
    delete from auth.sessions where user_id = old.id;
  end if;

  return new;
end;
$$;

revoke all on function public.apply_customer_auth_change() from public, anon, authenticated, service_role;
drop trigger if exists apply_customer_auth_change on auth.users;
create trigger apply_customer_auth_change before update of banned_until, deleted_at on auth.users
  for each row execute function public.apply_customer_auth_change();

create or replace function public.prevent_disabled_admin_promotion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role = 'admin' and old.role is distinct from 'admin' and exists (
    select 1 from auth.users u
    where u.id = new.id and (u.deleted_at is not null or u.banned_until > now())
  ) then
    raise exception using errcode = '42501', message = 'CUSTOMER_ACCOUNT_DISABLED';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_disabled_admin_promotion() from public, anon, authenticated, service_role;
drop trigger if exists prevent_disabled_admin_promotion on public.profiles;
create trigger prevent_disabled_admin_promotion before update of role on public.profiles
  for each row execute function public.prevent_disabled_admin_promotion();

-- Previously issued JWTs can still reach the Data API until expiry.
create or replace function public.require_active_customer_account()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.jwt() ->> 'role' = 'authenticated' and auth.uid() is not null and not exists (
    select 1 from auth.users u
    where u.id = auth.uid() and u.deleted_at is null
      and (u.banned_until is null or u.banned_until <= now())
  ) then
    raise exception using errcode = '42501', message = 'CUSTOMER_ACCOUNT_DISABLED';
  end if;
end;
$$;

revoke all on function public.require_active_customer_account() from public;
grant execute on function public.require_active_customer_account() to anon, authenticated, service_role;

do $$
begin
  if exists (
    select 1 from pg_db_role_setting s
      cross join lateral unnest(s.setconfig) as setting
    where setting like 'pgrst.db_pre_request=%'
      and setting <> 'pgrst.db_pre_request=public.require_active_customer_account'
  ) then
    raise exception 'An existing Data API hook must be preserved.';
  end if;
end;
$$;

alter role authenticator set pgrst.db_pre_request = 'public.require_active_customer_account';
notify pgrst, 'reload config';
notify pgrst, 'reload schema';

commit;

begin;

create table if not exists public.primary_admin (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null references public.profiles(id) on update restrict on delete restrict
);

alter table public.primary_admin enable row level security;
revoke all on public.primary_admin from public, anon, authenticated, service_role;

-- Profile creation already happens in the auth signup trigger. Client roles
-- can still edit the same contact fields without being able to set a role.
revoke insert, truncate, update on public.profiles from public, anon, authenticated;
revoke insert (role) on public.profiles from public, anon, authenticated;
revoke update (role) on public.profiles from public, anon, authenticated;
grant update (full_name, phone, city) on public.profiles to authenticated;

create or replace function public.protect_primary_admin_entry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op <> 'INSERT' then
    raise exception using errcode = '42501', message = 'PRIMARY_ADMIN_PROTECTED';
  end if;

  -- Provisioning is a one-time operation by the database owner.
  perform 1 from public.profiles
    where id = new.user_id and role = 'admin'
    for no key update;

  if not found then
    raise exception using errcode = '22023', message = 'PRIMARY_ADMIN_MUST_BE_ADMIN';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_primary_admin_entry() from public, anon, authenticated, service_role;
drop trigger if exists protect_primary_admin_entry on public.primary_admin;
create trigger protect_primary_admin_entry before insert or update or delete on public.primary_admin
  for each row execute function public.protect_primary_admin_entry();
drop trigger if exists protect_primary_admin_truncate on public.primary_admin;
create trigger protect_primary_admin_truncate before truncate on public.primary_admin
  for each statement execute function public.protect_primary_admin_entry();

create or replace function public.protect_primary_admin_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from 'admin' and exists (
    select 1 from public.primary_admin where user_id = old.id
  ) then
    raise exception using errcode = '42501', message = 'PRIMARY_ADMIN_PROTECTED';
  end if;
  return new;
end;
$$;

revoke all on function public.protect_primary_admin_role() from public, anon, authenticated, service_role;
drop trigger if exists protect_primary_admin_role on public.profiles;
create trigger protect_primary_admin_role before update of role on public.profiles
  for each row execute function public.protect_primary_admin_role();

create or replace function public.is_primary_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.primary_admin
    where user_id = auth.uid()
  );
$$;

create or replace function public.admin_list_administrators()
returns table (id uuid, full_name text, email text, is_primary boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_primary_admin() then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  return query
    select p.id, p.full_name, u.email::text, p.id = auth.uid()
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.role = 'admin'
    order by (p.id = auth.uid()) desc, u.email, p.id;
end;
$$;

create or replace function public.admin_grant_access(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid;
  confirmed_at timestamptz;
begin
  if not public.is_primary_admin() then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  begin
    select u.id, u.email_confirmed_at into strict account_id, confirmed_at
    from auth.users u
    join public.profiles p on p.id = u.id
    where lower(u.email) = lower(btrim(p_email));
  exception when no_data_found or too_many_rows then
    raise exception using errcode = '22023', message = 'ADMIN_ACCOUNT_NOT_FOUND';
  end;

  if confirmed_at is null then
    raise exception using errcode = '22023', message = 'ADMIN_ACCOUNT_UNCONFIRMED';
  end if;

  update public.profiles set role = 'admin'
  where id = account_id and role = 'member';

  if not found then
    raise exception using errcode = '22023', message = 'ADMIN_ACCOUNT_ALREADY_ADMIN';
  end if;
end;
$$;

create or replace function public.admin_revoke_access(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_primary_admin() then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  if p_user_id = auth.uid() then
    raise exception using errcode = '42501', message = 'PRIMARY_ADMIN_PROTECTED';
  end if;

  update public.profiles set role = 'member'
  where id = p_user_id and role = 'admin';

  if not found then
    raise exception using errcode = '22023', message = 'ADMIN_ACCOUNT_NOT_FOUND';
  end if;
end;
$$;

revoke all on function public.is_primary_admin() from public, anon;
revoke all on function public.admin_list_administrators() from public, anon;
revoke all on function public.admin_grant_access(text) from public, anon;
revoke all on function public.admin_revoke_access(uuid) from public, anon;
grant execute on function public.is_primary_admin() to authenticated;
grant execute on function public.admin_list_administrators() to authenticated;
grant execute on function public.admin_grant_access(text) to authenticated;
grant execute on function public.admin_revoke_access(uuid) to authenticated;

commit;

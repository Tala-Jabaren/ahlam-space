begin;

create or replace function public.fill_profile_signup_contact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  signup_metadata jsonb;
  signup_phone text;
  signup_city text;
begin
  select raw_user_meta_data into signup_metadata
  from auth.users
  where id = new.id;

  signup_phone := signup_metadata ->> 'phone';
  signup_city := btrim(signup_metadata ->> 'city');

  if nullif(btrim(new.phone), '') is null
    and jsonb_typeof(signup_metadata -> 'phone') = 'string'
    and signup_phone ~ '^[+]?[0-9]{7,15}$' then
    new.phone := signup_phone;
  end if;

  if nullif(btrim(new.city), '') is null
    and jsonb_typeof(signup_metadata -> 'city') = 'string'
    and char_length(signup_city) between 1 and 100 then
    new.city := signup_city;
  end if;

  return new;
end;
$$;

revoke all on function public.fill_profile_signup_contact() from public, anon, authenticated;

-- Reuse the existing auth signup trigger that creates the profile.
drop trigger if exists fill_profile_signup_contact_before_insert on public.profiles;
create trigger fill_profile_signup_contact_before_insert
before insert on public.profiles
for each row execute function public.fill_profile_signup_contact();

commit;

-- REVIEW ONLY: do not execute automatically. Requires public.is_admin().
-- courses.content_type is expected to be text with video/article CHECKs.
-- No courses, purchases or storage objects are inserted by this script.
begin;

alter table public.courses add column if not exists audio_path text;
alter table public.courses add column if not exists duration_minutes integer;

-- Replace only single-column content_type CHECKs; keep all other checks.
do $$
declare rule record;
begin
  for rule in
    select c.conname from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attname = 'content_type'
    where c.conrelid = 'public.courses'::regclass and c.contype = 'c'
      and c.conkey = array[a.attnum]::smallint[]
  loop
    execute format('alter table public.courses drop constraint %I', rule.conname);
  end loop;
  alter table public.courses add constraint courses_content_type_check
    check (content_type in ('video', 'article', 'audio'));
  if not exists (select 1 from pg_constraint where conrelid = 'public.courses'::regclass and conname = 'courses_duration_positive') then
    alter table public.courses add constraint courses_duration_positive
      check (duration_minutes is null or duration_minutes > 0);
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meditations', 'meditations', false, 52428800,
  array['audio/mp4', 'audio/mpeg', 'audio/x-m4a'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public metadata remains readable under existing RLS, but audio paths do not.
-- Table-level SELECT overrides column restrictions, so replace it with explicit
-- grants for all existing columns except audio_path. Existing RLS is unchanged.
revoke select on public.courses from public, anon, authenticated;
revoke select (audio_path) on public.courses from public, anon, authenticated;
do $$
declare columns_sql text;
begin
  select string_agg(format('%I', attname), ', ' order by attnum) into columns_sql
  from pg_attribute where attrelid = 'public.courses'::regclass
    and attnum > 0 and not attisdropped and attname <> 'audio_path';
  execute format('grant select (%s) on public.courses to anon, authenticated', columns_sql);
end $$;

-- Definer helpers are needed because audio_path itself is not client-readable.
-- They are bound to auth.uid(); callers cannot supply a different buyer ID.
create or replace function public.can_access_meditation(p_object_name text)
returns boolean language sql stable security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and (
    coalesce(public.is_admin(), false) or exists (
      select 1 from public.courses c
      join public.course_purchases cp on cp.course_id = c.id
      where c.content_type = 'audio' and c.audio_path = p_object_name
        and c.is_active = true and cp.user_id = auth.uid() and cp.status = 'paid'
    )
  );
$$;
revoke all on function public.can_access_meditation(text) from public;
-- Anon receives only a boolean false, including inside restrictive policies.
grant execute on function public.can_access_meditation(text) to anon, authenticated;

create or replace function public.get_meditation_audio_path(p_course_id uuid)
returns text language sql stable security definer
set search_path = public, pg_temp
as $$
  select c.audio_path from public.courses c
  where c.id = p_course_id and c.content_type = 'audio'
    and public.can_access_meditation(c.audio_path);
$$;
revoke all on function public.get_meditation_audio_path(uuid) from public, anon;
grant execute on function public.get_meditation_audio_path(uuid) to authenticated;

drop policy if exists "Paid buyers and admins read meditations" on storage.objects;
create policy "Paid buyers and admins read meditations" on storage.objects
for select to authenticated using (
  bucket_id = 'meditations' and coalesce(public.can_access_meditation(name), false)
);
drop policy if exists "Admins insert meditations" on storage.objects;
create policy "Admins insert meditations" on storage.objects
for insert to authenticated with check (bucket_id = 'meditations' and coalesce(public.is_admin(), false));
drop policy if exists "Admins update meditations" on storage.objects;
create policy "Admins update meditations" on storage.objects
for update to authenticated using (bucket_id = 'meditations' and coalesce(public.is_admin(), false))
with check (bucket_id = 'meditations' and coalesce(public.is_admin(), false));
drop policy if exists "Admins delete meditations" on storage.objects;
create policy "Admins delete meditations" on storage.objects
for delete to authenticated using (bucket_id = 'meditations' and coalesce(public.is_admin(), false));

-- Restrictive guards stop any existing broad storage policy from opening this
-- bucket. Other buckets retain their existing permissions.
drop policy if exists "Guard meditation reads" on storage.objects;
create policy "Guard meditation reads" on storage.objects as restrictive
for select to public using (bucket_id <> 'meditations' or coalesce(public.can_access_meditation(name), false));
drop policy if exists "Guard meditation inserts" on storage.objects;
create policy "Guard meditation inserts" on storage.objects as restrictive
for insert to public with check (bucket_id <> 'meditations' or (auth.uid() is not null and coalesce(public.is_admin(), false)));
drop policy if exists "Guard meditation updates" on storage.objects;
create policy "Guard meditation updates" on storage.objects as restrictive
for update to public using (bucket_id <> 'meditations' or (auth.uid() is not null and coalesce(public.is_admin(), false)))
with check (bucket_id <> 'meditations' or (auth.uid() is not null and coalesce(public.is_admin(), false)));
drop policy if exists "Guard meditation deletes" on storage.objects;
create policy "Guard meditation deletes" on storage.objects as restrictive
for delete to public using (bucket_id <> 'meditations' or (auth.uid() is not null and coalesce(public.is_admin(), false)));

notify pgrst, 'reload schema';
commit;

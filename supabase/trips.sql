-- REVIEW AND RUN MANUALLY in the Supabase SQL editor. NOT run by Claude.
--
-- Adds the "المشاوير" (trips/retreats) feature: Ahlam creates trips and
-- uploads photos from a new /admin/trips area; logged-in members apply
-- through a questionnaire; Ahlam reviews each application.
--
-- Sections:
--   A. trips, trip_photos, trip_applications tables + RLS.
--   B. submit_trip_application / withdraw_trip_application (member-facing).
--   C. admin_list_trip_applications / admin_review_trip_application /
--      admin_delete_trip / admin_delete_trip_photo (admin-facing).
--   D. Owner notification: a DEDICATED trigger function on
--      trip_applications, NOT a redefinition of the shared
--      enqueue_admin_notification() - see the note in section D. Also
--      widens admin_notification_queue's kind check constraint - see the
--      note there, this is a shared-object change worth reading even
--      though it isn't a function redefinition.
--
-- Deliberately NOT touched by this file: admin_delete_record() (root
-- admin-delete-record.sql) - trips get their own admin_delete_trip /
-- admin_delete_trip_photo functions instead, so this file never has to
-- CREATE OR REPLACE that shared function. The already-merged reviews
-- feature added its own 'review' case to admin_delete_record via its own
-- file's CREATE OR REPLACE; if this file also redefined that function,
-- whichever of the two gets run last in the SQL editor would silently
-- drop the other's case. Keeping trips' deletes on separate functions
-- avoids that entirely - no version of admin_delete_record from any
-- branch needs touching for trips to work.
--
-- No price column on trips - the owner hasn't decided on one yet; nothing
-- here invents one.

begin;

-- =============================================================================
-- A. Tables + RLS
-- =============================================================================

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  location text not null,
  starts_on date not null,
  ends_on date not null,
  application_deadline date,
  capacity integer,
  cover_image_url text,
  status text not null default 'draft' check (status in ('draft', 'open', 'closed', 'past')),
  created_at timestamptz not null default now()
);

alter table public.trips enable row level security;

drop policy if exists "Public can view non-draft trips" on public.trips;
create policy "Public can view non-draft trips" on public.trips
  for select to anon, authenticated using (status in ('open', 'closed', 'past'));

drop policy if exists "Admins can do everything on trips" on public.trips;
create policy "Admins can do everything on trips" on public.trips
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.trip_photos (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  photo_url text not null,
  caption text,
  display_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.trip_photos enable row level security;

-- Published AND the parent trip isn't a draft - a photo can't leak a trip
-- that isn't public yet just because someone flips is_published early.
drop policy if exists "Public can view published photos of non-draft trips" on public.trip_photos;
create policy "Public can view published photos of non-draft trips" on public.trip_photos
  for select to anon, authenticated using (
    is_published = true
    and exists (
      select 1 from public.trips t
      where t.id = trip_photos.trip_id and t.status in ('open', 'closed', 'past')
    )
  );

drop policy if exists "Admins can do everything on trip_photos" on public.trip_photos;
create policy "Admins can do everything on trip_photos" on public.trip_photos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.trip_applications (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text not null,
  attended_before boolean not null,
  attended_details text check (attended_details is null or char_length(attended_details) <= 1000),
  intention text not null check (char_length(intention) <= 1500),
  comfortable_with_strangers boolean not null,
  surgery_last_6_months boolean not null,
  did_emotional_release boolean not null,
  can_do_physical_activity boolean not null,
  wants_new_experiences boolean not null,
  consent_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'waitlisted', 'declined', 'withdrawn')),
  admin_note text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (trip_id, user_id)
);

alter table public.trip_applications enable row level security;

-- Health-related answers: deliberately NO insert/update/delete policy for
-- members, and admin gets SELECT only - every write (member submit/
-- withdraw, admin review) goes through a SECURITY DEFINER RPC below
-- instead of a direct table write, so even an authenticated admin client
-- can't UPDATE this table straight through PostgREST. Members can only
-- ever see their own rows; there is no "view all my applications across
-- trips" public policy gap here since this still filters by user_id.
drop policy if exists "Members can view their own trip applications" on public.trip_applications;
create policy "Members can view their own trip applications" on public.trip_applications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "Admins can view all trip applications" on public.trip_applications;
create policy "Admins can view all trip applications" on public.trip_applications
  for select to authenticated using (public.is_admin());

-- =============================================================================
-- B. Member-facing RPCs
-- =============================================================================

create or replace function public.submit_trip_application(
  p_trip_id uuid,
  p_full_name text,
  p_phone text,
  p_email text,
  p_attended_before boolean,
  p_attended_details text,
  p_intention text,
  p_comfortable_with_strangers boolean,
  p_surgery_last_6_months boolean,
  p_did_emotional_release boolean,
  p_can_do_physical_activity boolean,
  p_wants_new_experiences boolean,
  p_consent boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_trip_status text;
  v_deadline date;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  if p_consent is distinct from true then
    raise exception 'CONSENT_REQUIRED';
  end if;

  select t.status, t.application_deadline into v_trip_status, v_deadline
    from public.trips t where t.id = p_trip_id for update;
  if not found then raise exception 'TRIP_NOT_FOUND'; end if;
  if v_trip_status is distinct from 'open' then raise exception 'TRIP_NOT_OPEN'; end if;
  if v_deadline is not null and v_deadline < current_date then
    raise exception 'DEADLINE_PASSED';
  end if;

  if p_full_name is null or char_length(trim(p_full_name)) = 0 or char_length(p_full_name) > 200 then
    raise exception 'INVALID_NAME';
  end if;
  if p_phone is null or char_length(trim(p_phone)) = 0 or char_length(p_phone) > 50 then
    raise exception 'INVALID_PHONE';
  end if;
  if p_email is null or char_length(trim(p_email)) = 0 or char_length(p_email) > 200 then
    raise exception 'INVALID_EMAIL';
  end if;
  if p_attended_details is not null and char_length(p_attended_details) > 1000 then
    raise exception 'ATTENDED_DETAILS_TOO_LONG';
  end if;
  if p_intention is null or char_length(p_intention) = 0 or char_length(p_intention) > 1500 then
    raise exception 'INVALID_INTENTION';
  end if;

  if exists (
    select 1 from public.trip_applications a
    where a.trip_id = p_trip_id and a.user_id = auth.uid()
  ) then
    raise exception 'ALREADY_APPLIED';
  end if;

  insert into public.trip_applications (
    trip_id, user_id, full_name, phone, email,
    attended_before, attended_details, intention,
    comfortable_with_strangers, surgery_last_6_months,
    did_emotional_release, can_do_physical_activity, wants_new_experiences,
    consent_at, status
  ) values (
    p_trip_id, auth.uid(), trim(p_full_name), trim(p_phone), trim(p_email),
    p_attended_before, nullif(trim(coalesce(p_attended_details, '')), ''), p_intention,
    p_comfortable_with_strangers, p_surgery_last_6_months,
    p_did_emotional_release, p_can_do_physical_activity, p_wants_new_experiences,
    now(), 'pending'
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_trip_application(
  uuid, text, text, text, boolean, text, text, boolean, boolean, boolean, boolean, boolean, boolean
) from public, anon;
grant execute on function public.submit_trip_application(
  uuid, text, text, text, boolean, text, text, boolean, boolean, boolean, boolean, boolean, boolean
) to authenticated;

create or replace function public.withdraw_trip_application(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_status text;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  select a.user_id, a.status into v_user_id, v_status
    from public.trip_applications a where a.id = p_id for update;
  if not found then raise exception 'RECORD_NOT_FOUND'; end if;
  if v_user_id is distinct from auth.uid() then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  if v_status not in ('pending', 'waitlisted') then
    raise exception 'CANNOT_WITHDRAW';
  end if;

  update public.trip_applications set status = 'withdrawn' where id = p_id;
  return p_id;
end;
$$;

revoke all on function public.withdraw_trip_application(uuid) from public, anon;
grant execute on function public.withdraw_trip_application(uuid) to authenticated;

-- =============================================================================
-- C. Admin-facing RPCs
-- =============================================================================

create or replace function public.admin_list_trip_applications(p_trip_id uuid)
returns table (
  id uuid,
  trip_id uuid,
  full_name text,
  phone text,
  email text,
  attended_before boolean,
  attended_details text,
  intention text,
  comfortable_with_strangers boolean,
  surgery_last_6_months boolean,
  did_emotional_release boolean,
  can_do_physical_activity boolean,
  wants_new_experiences boolean,
  status text,
  admin_note text,
  reviewed_at timestamptz,
  created_at timestamptz
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
    a.id, a.trip_id, a.full_name, a.phone, a.email,
    a.attended_before, a.attended_details, a.intention,
    a.comfortable_with_strangers, a.surgery_last_6_months,
    a.did_emotional_release, a.can_do_physical_activity, a.wants_new_experiences,
    a.status, a.admin_note, a.reviewed_at, a.created_at
  from public.trip_applications a
  left join public.trips t on t.id = a.trip_id
  where a.trip_id = p_trip_id
  order by a.created_at asc;
end;
$$;

revoke all on function public.admin_list_trip_applications(uuid) from public, anon;
grant execute on function public.admin_list_trip_applications(uuid) to authenticated;

create or replace function public.admin_review_trip_application(p_id uuid, p_status text, p_note text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  if p_status not in ('approved', 'waitlisted', 'declined') then
    raise exception 'INVALID_STATUS';
  end if;

  perform a.id from public.trip_applications a where a.id = p_id for update;
  if not found then raise exception 'RECORD_NOT_FOUND'; end if;

  update public.trip_applications
  set status = p_status,
      admin_note = nullif(trim(coalesce(p_note, '')), ''),
      reviewed_at = now(),
      reviewed_by = auth.uid()
  where id = p_id;

  return p_id;
end;
$$;

revoke all on function public.admin_review_trip_application(uuid, text, text) from public, anon;
grant execute on function public.admin_review_trip_application(uuid, text, text) to authenticated;

create or replace function public.admin_delete_trip(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  perform t.id from public.trips t where t.id = p_id for update;
  if not found then raise exception 'RECORD_NOT_FOUND'; end if;

  -- trip_photos and trip_applications cascade via their own FK on_delete.
  delete from public.trips where id = p_id;
  return p_id;
end;
$$;

revoke all on function public.admin_delete_trip(uuid) from public, anon;
grant execute on function public.admin_delete_trip(uuid) to authenticated;

create or replace function public.admin_delete_trip_photo(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  perform p.id from public.trip_photos p where p.id = p_id for update;
  if not found then raise exception 'RECORD_NOT_FOUND'; end if;

  delete from public.trip_photos where id = p_id;
  return p_id;
end;
$$;

revoke all on function public.admin_delete_trip_photo(uuid) from public, anon;
grant execute on function public.admin_delete_trip_photo(uuid) to authenticated;

-- =============================================================================
-- D. Owner notification
-- =============================================================================
--
-- admin_notification_queue already exists (supabase/class-reminders.sql)
-- with "kind text not null check (kind in ('booking', 'session_request',
-- 'order', 'course_purchase'))". Adding 'trip_application' requires
-- widening that constraint. Written defensively/idempotently (drop-if-
-- exists then recreate with the full list) under an explicit name this
-- file controls, so re-running this file is safe - but note the same
-- category of risk the admin_delete_record redefinition would have had:
-- if another branch also widens this same constraint independently with a
-- *different* new kind, whichever SQL runs last in the editor wins and
-- would silently drop the other branch's kind from the allowed list. If
-- that ever happens, the fix is a single ALTER re-adding the union of
-- every kind both branches need - not re-running either file blindly.
alter table public.admin_notification_queue
  drop constraint if exists admin_notification_queue_kind_check;
alter table public.admin_notification_queue
  add constraint admin_notification_queue_kind_check
  check (kind in ('booking', 'session_request', 'order', 'course_purchase', 'trip_application'));

-- A DEDICATED trigger function, not a redefinition of the shared
-- enqueue_admin_notification() - same resilience pattern (the queue
-- insert is wrapped in its own BEGIN/EXCEPTION so it can never fail the
-- application insert itself; any failure here is downgraded to a WARNING,
-- not re-raised).
create or replace function public.enqueue_trip_application_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  begin
    insert into public.admin_notification_queue (kind, ref_id)
    values ('trip_application', new.id);
  exception when others then
    raise warning 'enqueue_trip_application_notification failed: %', sqlerrm;
  end;
  return new;
end;
$$;

revoke all on function public.enqueue_trip_application_notification()
  from public, anon, authenticated;
grant execute on function public.enqueue_trip_application_notification() to service_role;

drop trigger if exists enqueue_trip_application_notification on public.trip_applications;
create trigger enqueue_trip_application_notification
  after insert on public.trip_applications
  for each row execute function public.enqueue_trip_application_notification();

commit;

-- =============================================================================
-- Read-only verification after installing
-- =============================================================================
-- select conname, pg_get_constraintdef(oid) from pg_constraint
-- where conrelid = 'public.admin_notification_queue'::regclass
--   and conname = 'admin_notification_queue_kind_check';
-- select tgname from pg_trigger where tgrelid = 'public.trip_applications'::regclass;
-- select id, title, status from public.trips order by created_at desc limit 5;

-- REVIEW AND RUN MANUALLY in the Supabase SQL editor as postgres.
-- Adds the columns the admin "add a new class" form now needs (a cover
-- image, and whether the class repeats every week), and moves the weekly
-- recurrence rule out of generate_weekly_class_sessions()'s hardcoded
-- VALUES list (see supabase/weekly-class-sessions.sql) into real columns on
-- classes, so Ahlam can mark a class recurring from the admin UI herself
-- instead of asking for this file to be hand-edited every time.
-- Never updates/deletes existing sessions, bookings, prices, or booking RPCs.
--
-- DO NOT RE-RUN THIS FILE after admins have edited recurring classes in the
-- UI: the four backfill UPDATE statements below would reset those classes'
-- is_recurring/weekday/default_start_time back to their original values,
-- overwriting whatever was changed through the admin form afterward. This
-- file is meant to run exactly once.
--
-- Weekly generation still computes "today"/offsets in Asia/Jerusalem,
-- inherited unchanged from supabase/weekly-class-sessions.sql. The rest of
-- the app is moving to Asia/Hebron (see src/lib/class-cards.ts) but that
-- unification is a separate change - do not touch the timezone here.
--
-- Read-only pre-flight checks - run these manually and review the output
-- BEFORE running the migration below:
--
-- (a) Confirm classes still has is_active and duration_minutes:
-- select column_name, data_type from information_schema.columns
-- where table_schema = 'public' and table_name = 'classes'
--   and column_name in ('is_active', 'duration_minutes');
--
-- (b) Confirm the 4 backfilled classes' durations match what the backfilled
-- default_start_time values below assume (90, 90, 45 - Wednesday Mix - and
-- 90 minutes respectively). If any of these differ, generate_weekly_class_
-- sessions() will compute a different end_time than the class has been
-- meeting at - fix the backfill UPDATEs (or the class's duration_minutes)
-- to match before running, don't just proceed:
-- select id, name, duration_minutes from public.classes
-- where id in (
--   '681580e9-5902-489c-b593-657dc14f3c7f',
--   '08213564-f802-4484-a11a-04047b34fad4',
--   '538c29c1-105e-4a86-905b-864fba7da936',
--   '7cbcab94-4491-40eb-94bd-78ae4e418a87'
-- );
--
-- (c) Confirm RLS is still enabled on classes and review its policy list
-- (the new columns below rely on the existing table-level grants and
-- admin-only insert/update policies - see note 4 near the end of this file):
-- select relrowsecurity from pg_class
-- where relname = 'classes' and relnamespace = 'public'::regnamespace;
-- select policyname, cmd, roles, qual, with_check from pg_policies
-- where schemaname = 'public' and tablename = 'classes';

begin;

alter table public.classes
  add column if not exists image_url text,
  add column if not exists is_recurring boolean not null default false,
  add column if not exists weekday smallint,
  add column if not exists default_start_time time;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'classes_weekday_check'
  ) then
    alter table public.classes
      add constraint classes_weekday_check check (weekday is null or weekday between 0 and 6);
  end if;
end;
$$;

-- Backfill the 4 classes that generate_weekly_class_sessions() has been
-- recurring from a hardcoded rule table (Sunday/Tuesday/Wednesday/Friday
-- evening - see supabase/weekly-class-sessions.sql for the original rule),
-- so they keep recurring unchanged once the function below reads from this
-- table instead. Double-check each class's duration_minutes still matches
-- the gap implied here (90, 90, 45, 90 minutes - see pre-flight check (b)
-- above) before running.
update public.classes set is_recurring = true, weekday = 0, default_start_time = time '18:00' where id = '681580e9-5902-489c-b593-657dc14f3c7f';
update public.classes set is_recurring = true, weekday = 2, default_start_time = time '18:00' where id = '08213564-f802-4484-a11a-04047b34fad4';
update public.classes set is_recurring = true, weekday = 3, default_start_time = time '18:00' where id = '538c29c1-105e-4a86-905b-864fba7da936';
update public.classes set is_recurring = true, weekday = 5, default_start_time = time '08:00' where id = '7cbcab94-4491-40eb-94bd-78ae4e418a87';

-- Guard: all 4 of the above must have actually been marked recurring (e.g.
-- a typo'd id, or a row that no longer exists, would otherwise silently
-- update 0 rows and leave that class non-recurring). Roll back the whole
-- file rather than leave a partial backfill in place.
do $$
begin
  if (
    select count(*) from public.classes
    where is_recurring is true
      and id in (
        '681580e9-5902-489c-b593-657dc14f3c7f',
        '08213564-f802-4484-a11a-04047b34fad4',
        '538c29c1-105e-4a86-905b-864fba7da936',
        '7cbcab94-4491-40eb-94bd-78ae4e418a87'
      )
  ) <> 4 then
    raise exception 'BACKFILL_MISMATCH';
  end if;
end;
$$;

-- Same body/behavior as supabase/weekly-class-sessions.sql's function,
-- except the rule table (class_id, weekday, start_time, end_time) is now a
-- live query against classes.is_recurring/weekday/default_start_time
-- instead of a hardcoded values() list. The cron job already scheduled by
-- that file keeps calling this function by name, so no re-scheduling here.
create or replace function public.generate_weekly_class_sessions()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_local_now timestamp := clock_timestamp() at time zone 'Asia/Jerusalem';
  v_today date := v_local_now::date;
  v_rule record;
  v_template record;
  v_date date;
  v_offset integer;
  v_inserted integer;
  v_total integer := 0;
begin
  -- Serializes generators AND manual session writes: two simultaneous runs
  -- cannot both pass NOT EXISTS and create the same occurrence. Existing
  -- sessions and booking counters are not modified by this function.
  lock table public.class_sessions in share row exclusive mode;

  for v_rule in
    select
      class.id as class_id,
      class.weekday,
      class.default_start_time as start_time,
      (class.default_start_time + make_interval(mins => class.duration_minutes))::time as end_time
    from public.classes as class
    where class.is_recurring is true
      and class.is_active is true
      and class.weekday is not null
      and class.default_start_time is not null
    order by class.id
  loop
    -- Use the latest non-cancelled scheduled occurrence only as a template
    -- for capacity/location. Prices remain on classes and are not copied.
    select session.capacity, session.location
    into v_template
    from public.class_sessions as session
    where session.class_id = v_rule.class_id
      and session.status = 'scheduled'
    order by session.session_date desc, session.start_time desc, session.id
    limit 1;

    -- A bad/missing template on one recurring class (e.g. its only session
    -- was cancelled, or its capacity was corrupted) no longer aborts the
    -- whole run - warn and skip just that class so every other recurring
    -- class still gets its upcoming weeks generated.
    if not found then
      raise warning 'WEEKLY_SESSION_TEMPLATE_MISSING:%', v_rule.class_id;
      continue;
    end if;
    if v_template.capacity is null or v_template.capacity < 1 then
      raise warning 'WEEKLY_SESSION_CAPACITY_INVALID:%', v_rule.class_id;
      continue;
    end if;

    for v_offset in 0..13 loop
      v_date := v_today + v_offset;
      if extract(dow from v_date)::integer <> v_rule.weekday
        or v_date + v_rule.start_time <= v_local_now then
        continue;
      end if;

      insert into public.class_sessions (
        class_id, session_date, start_time, end_time,
        capacity, booked_count, status, location
      )
      select
        v_rule.class_id, v_date, v_rule.start_time, v_rule.end_time,
        v_template.capacity, 0, 'scheduled', v_template.location
      where not exists (
        -- ANY existing occurrence for this class/date blocks generation,
        -- including cancelled ones and ones manually moved to another time.
        select 1 from public.class_sessions as existing
        where existing.class_id = v_rule.class_id
          and existing.session_date = v_date
      );

      get diagnostics v_inserted = row_count;
      v_total := v_total + v_inserted;
    end loop;
  end loop;

  return v_total;
end;
$$;

-- Only the database owner/scheduled job can execute this SECURITY DEFINER
-- function. Ordinary members and anonymous API callers cannot generate rows.
revoke all on function public.generate_weekly_class_sessions()
  from public, anon, authenticated;

-- 4. No grants: public.classes already has table-level privileges for
-- anon/authenticated (no column-level grants) plus RLS with admin-only
-- insert/update policies, so the 4 new columns inherit that automatically.
-- Intentionally no GRANT statements here - do not add any.

commit;

-- Read-only verification after installing:
-- select id, name, is_recurring, weekday, default_start_time, image_url
-- from public.classes order by name;
-- select public.generate_weekly_class_sessions() as created_sessions;
-- (safe to run manually too - it's idempotent, see the NOT EXISTS guard above)

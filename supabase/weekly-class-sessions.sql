-- REVIEW AND RUN MANUALLY in the Supabase SQL editor as postgres.
-- Enable Supabase Cron (pg_cron) in Dashboard > Integrations > Cron first.
-- Running this file creates upcoming sessions immediately and enables a daily
-- job to keep the next 14 calendar days populated, starting today in Jerusalem.
-- It never updates/deletes existing sessions, bookings, prices, or booking RPCs.
-- The four class IDs below are from this project; Test Yoga is excluded.

begin;

do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise exception 'Enable Supabase Cron (pg_cron) before running this file.';
  end if;
end;
$$;

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
    select rules.*
    from (values
      -- Sunday evening yoga, Monday evening yoga, Tuesday Mix, Friday yoga.
      ('681580e9-5902-489c-b593-657dc14f3c7f'::uuid, 0, time '18:00', time '19:30'),
      ('08213564-f802-4484-a11a-04047b34fad4'::uuid, 1, time '18:00', time '19:30'),
      ('538c29c1-105e-4a86-905b-864fba7da936'::uuid, 2, time '18:00', time '18:45'),
      ('7cbcab94-4491-40eb-94bd-78ae4e418a87'::uuid, 5, time '08:00', time '09:30')
    ) as rules(class_id, weekday, start_time, end_time)
    join public.classes as class on class.id = rules.class_id
    where class.is_active is true
    order by rules.class_id
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

    if not found then
      raise exception 'WEEKLY_SESSION_TEMPLATE_MISSING:%', v_rule.class_id;
    end if;
    if v_template.capacity is null or v_template.capacity < 1 then
      raise exception 'WEEKLY_SESSION_CAPACITY_INVALID:%', v_rule.class_id;
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

-- Populate upcoming dates immediately when the owner runs this reviewed file.
select public.generate_weekly_class_sessions() as created_sessions;

-- Daily at 01:00 UTC. Date comparisons above ALWAYS use Asia/Jerusalem,
-- including daylight-saving changes. Re-running the script updates this named
-- job instead of adding another job. Daily checks also recover missed runs.
select cron.schedule(
  'ahlam-weekly-class-sessions',
  '0 1 * * *',
  $$select public.generate_weekly_class_sessions();$$
);

commit;

-- Read-only verification after installing:
-- select session_date, start_time, end_time, class_id, capacity, booked_count,
--        status, location
-- from public.class_sessions
-- where session_date >= (now() at time zone 'Asia/Jerusalem')::date
-- order by session_date, start_time;
-- select jobname, schedule, active from cron.job
-- where jobname = 'ahlam-weekly-class-sessions';
-- select status, return_message, start_time from cron.job_run_details
-- where jobid = (select jobid from cron.job
--                where jobname = 'ahlam-weekly-class-sessions')
-- order by start_time desc limit 5;

-- To pause recurrence later, run manually:
-- select cron.unschedule('ahlam-weekly-class-sessions');
-- This leaves all previously created sessions/bookings intact.

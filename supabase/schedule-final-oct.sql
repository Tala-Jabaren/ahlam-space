-- REVIEW AND RUN MANUALLY in the Supabase SQL editor. NOT run by Claude.
-- Column names (classes.name/description/price, class_sessions.class_id/
-- session_date/start_time/booked_count/status) verified against
-- src/types/database.ts before writing this file - not guessed.
--
-- EXACT RUN ORDER:
--   1. This file's section A below (class renames, descriptions, prices).
--      No dependency on anything else - safe to run first.
--   2. The UPDATED supabase/weekly-class-sessions.sql (new weekday/time
--      rules). This MUST run before this file's cleanup section (B) below:
--      generate_weekly_class_sessions() finds its capacity/location
--      template by looking for the latest still-'scheduled' occurrence of
--      each class_id - if the old Monday/Tuesday occurrences were already
--      cancelled first, there would be nothing left to copy from and it
--      would raise WEEKLY_SESSION_TEMPLATE_MISSING for that class.
--   3. This file's section B: run the two SELECTs first and read the
--      results. Only run the UPDATE once the "will be cancelled" list
--      looks right and the "has bookings, left alone" list is empty or
--      expected.

begin;

-- =============================================================================
-- A. Class renames, descriptions, and prices for the final schedule
-- =============================================================================

update public.classes
set
  name = 'يوغا مسائية - الثلاثاء',
  description = 'جلسة يوغا وتنفس وتأمل وأجواء لطيفة مع سناك صحي',
  price = 60
where id = '08213564-f802-4484-a11a-04047b34fad4';

update public.classes
set
  name = 'حصة Mix - الأربعاء',
  description = 'حصة Mix: حصة تمزج بين الرقص والتركيز على حركة الحوض مع الفتنس والتنفس',
  price = 45
where id = '538c29c1-105e-4a86-905b-864fba7da936';

-- Sunday class: name unchanged, description/price updated to match.
update public.classes
set
  description = 'جلسة يوغا وتنفس وتأمل وأجواء لطيفة مع سناك صحي',
  price = 60
where id = '681580e9-5902-489c-b593-657dc14f3c7f';

-- Friday class: name unchanged, description/price updated to match.
update public.classes
set
  description = 'جلسة يوغا وتمارين تمدد وفطور صباحي صحي',
  price = 60
where id = '7cbcab94-4491-40eb-94bd-78ae4e418a87';

commit;

-- =============================================================================
-- B. CLEANUP - run AFTER the updated weekly-class-sessions.sql has created
--    at least one new Tuesday/Wednesday occurrence for the two moved
--    classes. Cancels (never deletes) their old-weekday future sessions
--    that have no bookings. Sessions with bookings are left completely
--    untouched - review them manually instead.
-- =============================================================================

-- B1. Will be cancelled: future, old weekday, no bookings.
--     08213564 used to run Monday (dow=1); 538c29c1 used to run Tuesday (dow=2).
-- select id, class_id, session_date, start_time, booked_count
-- from public.class_sessions
-- where status = 'scheduled'
--   and session_date >= (now() at time zone 'Asia/Jerusalem')::date
--   and booked_count = 0
--   and (
--     (class_id = '08213564-f802-4484-a11a-04047b34fad4' and extract(dow from session_date) = 1)
--     or
--     (class_id = '538c29c1-105e-4a86-905b-864fba7da936' and extract(dow from session_date) = 2)
--   )
-- order by session_date, start_time;

-- B2. Has bookings - must NOT be cancelled. Review and contact these
--     bookings manually if the old-weekday session needs to be moved.
-- select id, class_id, session_date, start_time, booked_count
-- from public.class_sessions
-- where status = 'scheduled'
--   and session_date >= (now() at time zone 'Asia/Jerusalem')::date
--   and booked_count > 0
--   and (
--     (class_id = '08213564-f802-4484-a11a-04047b34fad4' and extract(dow from session_date) = 1)
--     or
--     (class_id = '538c29c1-105e-4a86-905b-864fba7da936' and extract(dow from session_date) = 2)
--   )
-- order by session_date, start_time;

-- B3. The actual cancellation - only after confirming B1's list is correct
--     and B2 is empty or its sessions are being handled separately.
-- begin;
-- update public.class_sessions
-- set status = 'cancelled'
-- where status = 'scheduled'
--   and session_date >= (now() at time zone 'Asia/Jerusalem')::date
--   and booked_count = 0
--   and (
--     (class_id = '08213564-f802-4484-a11a-04047b34fad4' and extract(dow from session_date) = 1)
--     or
--     (class_id = '538c29c1-105e-4a86-905b-864fba7da936' and extract(dow from session_date) = 2)
--   );
-- commit;

-- Cancellation RPC for member bookings.
-- Review and run this in Supabase SQL Editor when ready.

create or replace function cancel_booking(
  p_booking_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_booking_status text;
  v_session_date date;
  v_start_time time;
  v_session_start timestamp;
begin
  select
    bookings.session_id,
    bookings.status
  into
    v_session_id,
    v_booking_status
  from bookings
  where bookings.id = p_booking_id
    and bookings.user_id = p_user_id
  for update;

  if not found then
    raise exception 'NOT_YOUR_BOOKING';
  end if;

  select
    class_sessions.session_date,
    class_sessions.start_time
  into
    v_session_date,
    v_start_time
  from class_sessions
  where class_sessions.id = v_session_id
  for update;

  if not found then
    raise exception 'SESSION_NOT_FOUND';
  end if;

  v_session_start := v_session_date + v_start_time;

  if v_session_start <= now() + interval '24 hours' then
    raise exception 'CANCELLATION_WINDOW_PASSED';
  end if;

  update bookings
  set status = 'cancelled'
  where id = p_booking_id;

  if v_booking_status <> 'cancelled' then
    update class_sessions
    set booked_count = greatest(booked_count - 1, 0)
    where id = v_session_id;
  end if;

  return true;
end;
$$;

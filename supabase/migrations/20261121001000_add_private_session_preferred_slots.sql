begin;

-- Suggested studio-local times (Asia/Jerusalem), independent of booking status.
alter table public.session_requests
  add column if not exists preferred_slots timestamp without time zone[]
  not null default '{}'
  check (cardinality(preferred_slots) <= 8 and array_position(preferred_slots, null) is null);

commit;

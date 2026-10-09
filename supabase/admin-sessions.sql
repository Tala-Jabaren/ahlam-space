-- Review and run manually. Requires public.is_admin() from admin-payments.sql.
-- Existing SELECT policies and all booking/payment functions remain unchanged.
begin;

alter table public.classes enable row level security;
alter table public.class_sessions enable row level security;
alter table public.courses enable row level security;

drop policy if exists "Admins can insert classes" on public.classes;
create policy "Admins can insert classes" on public.classes
  for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins can update classes" on public.classes;
create policy "Admins can update classes" on public.classes
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can insert class sessions" on public.class_sessions;
create policy "Admins can insert class sessions" on public.class_sessions
  for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins can update class sessions" on public.class_sessions;
create policy "Admins can update class sessions" on public.class_sessions
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can insert courses" on public.courses;
create policy "Admins can insert courses" on public.courses
  for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins can update courses" on public.courses;
create policy "Admins can update courses" on public.courses
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- A row CHECK also protects against concurrent bookings while capacity is edited.
-- Validation fails atomically if any existing row already violates this rule.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.class_sessions'::regclass
      and conname = 'class_sessions_capacity_covers_bookings'
  ) then
    alter table public.class_sessions
      add constraint class_sessions_capacity_covers_bookings
      check (capacity >= booked_count);
  end if;
end;
$$;

notify pgrst, 'reload schema';
commit;

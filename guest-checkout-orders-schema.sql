-- Review and run this file manually in the Supabase SQL editor.
-- It enables guest orders without changing authenticated order behavior.

begin;

alter table public.orders
  alter column user_id drop not null,
  add column if not exists guest_name text,
  add column if not exists guest_phone text,
  add column if not exists guest_email text;

-- Refresh PostgREST so the updated table shape is immediately available.
notify pgrst, 'reload schema';

commit;

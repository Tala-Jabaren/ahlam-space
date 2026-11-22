begin;

create table public.trip_gallery_photos (
  id uuid primary key default gen_random_uuid(),
  photo_url text not null,
  caption text,
  display_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create index trip_gallery_photos_order_idx on public.trip_gallery_photos (display_order, id);

-- Keep the existing photos, but keep previously hidden draft photos unpublished.
insert into public.trip_gallery_photos (id, photo_url, caption, display_order, is_published, created_at)
select p.id, p.photo_url, p.caption, p.display_order,
  p.is_published and t.status in ('open', 'closed', 'past'),
  p.created_at
from public.trip_photos p
join public.trips t on t.id = p.trip_id;

alter table public.trip_gallery_photos enable row level security;
revoke all on public.trip_gallery_photos from public, anon, authenticated;
grant select on public.trip_gallery_photos to anon, authenticated;
grant insert, update on public.trip_gallery_photos to authenticated;

create policy "Visitors can view published gallery photos"
  on public.trip_gallery_photos for select to anon, authenticated using (is_published);
create policy "Admins can view all gallery photos"
  on public.trip_gallery_photos for select to authenticated using ((select public.is_admin()));
create policy "Admins can add gallery photos"
  on public.trip_gallery_photos for insert to authenticated with check ((select public.is_admin()));
create policy "Admins can update gallery photos"
  on public.trip_gallery_photos for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create function public.admin_delete_trip_gallery_photo(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  delete from public.trip_gallery_photos where id = p_id;
  if not found then raise exception 'RECORD_NOT_FOUND'; end if;
  return p_id;
end;
$$;

revoke all on function public.admin_delete_trip_gallery_photo(uuid) from public, anon;
grant execute on function public.admin_delete_trip_gallery_photo(uuid) to authenticated;

commit;

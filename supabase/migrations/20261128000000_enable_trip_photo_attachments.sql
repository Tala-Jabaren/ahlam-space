begin;

-- The existing rows were copied into the shared gallery. Only photos
-- explicitly attached to a trip should appear in that trip's carousel.
alter table public.trip_photos
  add column if not exists is_trip_attachment boolean not null default false;

create index if not exists trip_photos_attachment_order_idx
  on public.trip_photos (trip_id, display_order, id) where is_trip_attachment;

commit;

-- REVIEW AND RUN MANUALLY in the Supabase SQL editor as postgres.
--
-- Admin uploads (course/class/trip/review/product images, meditation
-- audio) now go straight from the browser to Supabase Storage via a
-- signed upload URL, instead of through this app's own server - Vercel
-- hard-caps every request body a serverless function receives at 4.5MB,
-- well under this app's 60MB audio / 5MB image limits, so the full file
-- can never be POSTed to one of this app's own routes. See
-- src/lib/admin-upload.ts for the client side of this and
-- src/lib/admin-upload-request.ts for the server side.
--
-- Because of that, this app's own server never sees the complete file
-- any more and can't reject an oversized or wrong-type one by measuring
-- it directly - the bucket's own file_size_limit/allowed_mime_types
-- become the real enforcement backstop (the app's checks before issuing
-- a signed URL - a declared size, and a format sniffed from the file's
-- first 64 bytes - are real but advisory, since an admin account could
-- in principle lie about either before uploading the rest of the file
-- directly). This file brings both buckets used by admin uploads in line
-- with the limits this app already documents to the admin in its UI.
--
-- Never touches any table, row, or existing object in storage - only the
-- two buckets' own size/type configuration.

begin;

-- product-images: used by course/class/trip/review covers (under their
-- own prefixes) and product photos, all advertised in the admin UI as
-- "JPG أو PNG أو WebP، حتى 5 ميغابايت" (MAX_PRODUCT_IMAGE_BYTES). This
-- bucket predates the tracked migrations in this folder (created directly
-- in the dashboard, so there is no earlier CREATE to diff against) - this
-- is a safe upsert either way: it only touches this bucket's own limit
-- columns, never its objects.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- meditations: advertised in the admin UI as "حتى 60 ميغابايت"
-- (MAX_AUDIO_BYTES), but supabase/meditations.sql set file_size_limit to
-- 50MB (52428800) - raised here to actually match 60MB (62914560) now
-- that this bucket's own limit is the only backstop against an
-- oversized audio file. Does not touch public/allowed_mime_types, both
-- already set correctly by meditations.sql.
update storage.buckets
set file_size_limit = 62914560
where id = 'meditations';

commit;

-- Read-only verification after installing:
-- select id, public, file_size_limit, allowed_mime_types
-- from storage.buckets where id in ('product-images', 'meditations');

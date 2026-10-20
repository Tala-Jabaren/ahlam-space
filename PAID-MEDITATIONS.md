# Paid Meditations

Private session details were already merged before this branch was created.

## Existing Flow Reused

The repository uses these course fields: id, title, description, content_type,
price, video_url, article_body, cover_image_url, is_active, created_at (plus
optional translation columns documented elsewhere). The live database schema
was not modified or queried with SQL during development.

PurchaseCourseButton still inserts a course_purchases row with the current
user ID, pending status and bank_transfer. The existing database reference
generation and /admin/payments confirmation remain unchanged. Only paid
purchases unlock buyer access. Admins may preview audio without a purchase.
Existing video/article gates remain in place.

## Manual Deployment Order

1. Review supabase/meditations.sql, including its column-level SELECT grants.
   The script expects a text content_type column with video/article CHECKs.
   It preserves other course checks and existing course SELECT RLS policies.
   Do not deploy the application changes before applying the reviewed script.
2. Run the reviewed script yourself. No SQL was executed by this task.
3. Upload MP3/M4A files manually into the PRIVATE meditations bucket using
   Supabase Storage. Limit: 50 MB; allowed MIME types are audio/mp4,
   audio/mpeg and audio/x-m4a. Do not make the bucket public.
4. In /admin/courses create an audio meditation with title, description, price,
   duration_minutes and the exact object path (for example folder/file.mp3).
   The path is stored in courses.audio_path. This form does not upload files.
   No course rows or real purchases were inserted by this task.

## Access Boundaries

- Listing and unpaid detail queries fetch explicit metadata, not audio_path.
- Column grants deny direct audio_path SELECT to anon/authenticated, including
  admins. get_meditation_audio_path returns it only for the caller's paid
  purchase or admin status. The RPC accepts no buyer ID.
- Storage SELECT is independently limited to paid ownership/admin access.
  Restrictive policies stop broader pre-existing Storage policies from granting
  anonymous or unauthorized access to this bucket. Writes require admin status.
- Signing uses the server's user-session Supabase client, never service role.
  URLs expire after 3,600 seconds and are regenerated on every page load.
- controlsList="nodownload" hides the download control; it is not DRM. A paid
  buyer can copy an unexpired signed URL or record audio. Expired links require
  reloading the page; there is no automatic refresh during a listening session.
- Existing video signing still uses its previous server-only admin client.

## Verification

Build and lint pass. Headless Edge tests used an isolated local auth/REST/
Storage fixture, not the live database. Tested logged-out previews and login
returnTo, unpaid purchase, bank_transfer/pending payload, AS-1234 confirmation,
pending reload without media/path, paid own-session signing with 3,600-second
expiry, fresh links on reload, audio playback and error messages, admin preview
without purchase, and admin duration/path fields (no upload). Arabic/English
pending and paid player pages were checked at 375, 768 and 1440px with no
horizontal overflow. Legacy lecture metadata/edit requests do not depend on
the new audio fields; only audio records query or write the new columns.

The SQL/RLS rules have NOT been executed or integration-tested against Supabase.
Installing the unchanged main lockfile reported five high-severity npm
advisories; dependency upgrades were not included in this feature.
After manual deployment verify with separate buyer/admin accounts:

- Anonymous: public metadata works, audio_path SELECT and bucket access fail.
- Unpaid and pending buyer: path RPC returns null and audio signing fails.
- Paid buyer: matching course object signs; another course's object does not.
- Admin: can read/sign/upload/update/delete bucket objects and edit audio paths.
- Repeat the reviewed script to confirm idempotence in your actual schema.
- Existing lecture playback and other buckets still work.

If another integration uses courses.select('*'), change it to explicit safe
columns: the protected audio_path column intentionally makes SELECT * fail.
Bank account placeholders in the existing shared confirmation block must be
filled with the owner's verified details before accepting real transfers.

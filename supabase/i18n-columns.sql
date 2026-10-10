-- English columns for database content that is currently Arabic-only.
--
-- NOT RUN. This file is a proposal to review before running it manually in
-- the Supabase SQL editor - same convention as the other files in this
-- folder (see supabase/admin-payments.sql's header).
--
-- Scope: the public-facing UI text (nav, buttons, labels, static copy) is
-- now bilingual (see src/i18n/). Content that lives in the database is not
-- translated yet - these are the columns that would need an English
-- counterpart to fully localize the shop, classes, and courses pages:
--
--   classes.name          -> classes.name_en
--   classes.description   -> classes.description_en
--   products.name         -> products.name_en
--   products.description  -> products.description_en
--   courses.title         -> courses.title_en
--   courses.description   -> courses.description_en
--
-- Columns intentionally NOT included here, since nothing asked for them
-- yet - flagging in case the scope grows later:
--   classes.category (the small eyebrow label above a class name, e.g.
--   "يوغا") and class_sessions.location (e.g. "مركز أحلام") are also
--   free-text Arabic DB content shown as-is in the UI today.
--
-- Fallback pattern once these exist: show the English value when present,
-- otherwise fall back to the Arabic one - never show a blank field just
-- because a translation hasn't been entered yet for one row.
--   - In a query: select coalesce(name_en, name) as name from ...
--   - In application code (e.g. shop-catalog.tsx, courses/page.tsx):
--     product.name_en || product.name
-- All columns below are nullable with no default, so every existing row
-- starts in that "fall back to Arabic" state until someone fills in name_en
-- / description_en / title_en by hand.

begin;

alter table public.classes
  add column if not exists name_en text,
  add column if not exists description_en text;

alter table public.products
  add column if not exists name_en text,
  add column if not exists description_en text;

alter table public.courses
  add column if not exists title_en text,
  add column if not exists description_en text;

-- Make the new columns visible to PostgREST immediately.
notify pgrst, 'reload schema';

commit;

-- Review and run manually. This file has NOT been run by the application/agent.
-- Existing queue rows are retained after sending: claim_admin_notifications sets
-- sent_at, and release_admin_notifications resets it on failure. No retention change.
-- RLS currently denies ALL anon/authenticated access, including authenticated admins.
-- Keep those policies/grants untouched. Admin-only server reads/actions first call
-- getAdminSession(), then use the existing server-only service-role client.
-- Historical rows start unseen (NULL); there is deliberately no bulk backfill.

begin;
alter table public.admin_notification_queue
  add column if not exists seen_at timestamptz null;

create index if not exists admin_notification_queue_unseen_kind_idx
  on public.admin_notification_queue (kind) where seen_at is null;
commit;

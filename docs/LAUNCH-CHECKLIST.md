# Launch checklist

Manual steps to do in dashboards (Supabase, Resend, DNS/host) before the site goes live.
Nothing here is code - this is a checklist for you to work through, in roughly this order.

See also `docs/DEPLOY-STEPS.md` (the exact Vercel/Supabase/Resend setup order) and
`docs/PRODUCTION-SMOKE-TEST.md` (the click-by-click test to run after each deploy).

## 1. Domain and environment variables

- [ ] Point the real domain at the deployment (DNS).
- [ ] Set `NEXT_PUBLIC_SITE_URL` in the production environment to the real domain,
      e.g. `https://ahlamspace.com` (no trailing slash). It currently falls back to
      `http://localhost:3000`, which would make SEO tags, the sitemap, and
      `robots.txt` point at localhost if left unset.
- [ ] Double-check every variable in `.env.example` is set in production with real
      values (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
      `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`,
      `ADMIN_NOTIFY_EMAIL`, `CONTACT_TO_EMAIL`, `NEXT_PUBLIC_SITE_URL`).

## 2. Supabase project

- [ ] **Upgrade to Supabase Pro.** The free tier auto-pauses projects after a period
      of inactivity - this has already caused the dev database to go briefly
      unreachable more than once during this project. A paused project in
      production means the whole site goes down.
- [ ] **Turn email confirmation back on** (Authentication > Providers > Email >
      "Confirm email"). It's off for easier testing during development - launching
      with it off means anyone can sign up with an email they don't own.
- [ ] **Set up Resend's sending domain.** In the Resend dashboard: Domains > Add
      Domain, enter the real domain, then add the SPF/DKIM (and DMARC, if shown)
      DNS records it gives you at the registrar/DNS host. Wait for the domain's
      status to flip to "Verified" (can take a few minutes to a few hours for DNS
      to propagate) - sends from an unverified domain are rejected. Once verified,
      set `EMAIL_FROM` to an address on that domain, e.g.
      `Ahlam Space <notifications@ahlamspace.com>`. This is used by the contact
      form (which still relies on Resend's shared `onboarding@resend.dev` sender,
      hardcoded in `src/app/api/contact/route.ts` - update that too) and by the
      class-reminder / admin-notification cron emails (`src/lib/email/mailer.ts`).
- [ ] **Set `CRON_SECRET`** to a random value (e.g. `openssl rand -hex 32`) in the
      production environment. Vercel Cron sends it automatically as
      `Authorization: Bearer <CRON_SECRET>` to the two jobs in `vercel.json`
      (`/api/cron/class-reminders` hourly, `/api/cron/admin-notifications` every 5
      minutes) - without it set, both routes reject every request with 401,
      including Vercel's own cron calls.
- [ ] **Set `ADMIN_NOTIFY_EMAIL`** if the owner digest (new bookings, orders,
      session requests, course purchases) should go somewhere other than the
      `nmi.ahlam@gmail.com` default.
- [ ] **Run `supabase/class-reminders.sql`** in the SQL editor (adds
      `bookings.reminder_sent_at`, the claim/release/count functions, and the
      `admin_notification_queue` table + triggers the two cron jobs depend on).
      Without it, both cron routes fail every run (missing column/function/table).
- [x] ~~Replace the business email placeholder~~ - already done in code.
      `src/app/api/contact/route.ts` now reads
      `process.env.CONTACT_TO_EMAIL || 'nmi.ahlam@gmail.com'` (no hardcoded
      TODO left). Only remaining action: set `CONTACT_TO_EMAIL` in production if
      contact-form messages should go somewhere other than that default - same
      as the `ADMIN_NOTIFY_EMAIL` item above. The sender address is still
      hardcoded to Resend's shared `onboarding@resend.dev` though (see the
      "Set up Resend's sending domain" item above) - that part of the old note
      was accurate and still applies.
- [ ] **Update Auth redirect URLs** (Authentication > URL Configuration) to the
      real domain - Site URL and every Redirect URL currently pointing at a
      localhost or preview URL. Login, signup, and password-reset emails link
      using these, so leaving them unset sends users to the wrong place.
- [ ] **Set the owner's admin role.** `is_admin()` (see `supabase/admin-payments.sql`)
      checks `profiles.role = 'admin'`. After the real owner account signs up,
      run manually in the SQL editor:
      ```sql
      update public.profiles set role = 'admin' where id = '<owner-auth-user-id>';
      ```
      (Find the id in Authentication > Users, or `select id from auth.users where
      email = '...'`.) Without this, the owner can't reach `/admin` at all.
- [ ] **Confirm every SQL file in `supabase/` has actually been run**, in order,
      in the SQL editor. This repo cannot tell from the code which of these have
      already been applied to the live database - check each one manually:
      `admin-customers.sql`, `admin-payments.sql`, `admin-session-attendees.sql`,
      `admin-sessions.sql`, `class-reminders.sql`, `enable-expiry-crons.sql`,
      `i18n-columns.sql`, `meditation-access-expiry.sql`, `meditations.sql`,
      `schedule-final-oct.sql`, `weekly-class-sessions.sql`, and (new in this
      pass) `cleanup-test-data.sql` once you're ready to use it (see below - it
      ships wrapped in `rollback;` and does nothing until you change that line).
      The security review in an earlier pass found that `classes`,
      `class_sessions`, and `courses` only get admin-only write protection once
      `admin-sessions.sql` has actually been run - the client-side admin pages
      that write to those tables assume it has been.
- [ ] **Remove test users, orders, and bookings** created while building and
      testing the site. `supabase/cleanup-test-data.sql` (new in this pass)
      targets the specific test accounts and records found so far - review its
      `select` output first, then flip `rollback;` to `commit;` to actually
      delete. It only covers what was identifiable from this session's work; do
      a final manual check of `auth.users`, `profiles`, `bookings`, `orders`,
      `order_items`, `course_purchases`, and `session_requests` for anything
      else that isn't real before launch. `seed-real-content.sql` is the real
      catalog seed, not test data - leave that one alone.
- [ ] **Fill in the real bank transfer details.** `src/lib/bank-details.ts` still
      has placeholder `bankName`/`accountNumber` values ("اسم البنك", "رقم الحساب /
      IBAN") - every bank-transfer confirmation screen in the app shows these
      verbatim to customers. As of this pass, leaving them as placeholders in
      a deployed (production `NODE_ENV`) build now logs a loud server-side
      warning and shows a red "تنبيه للإدارة" banner directly on the payment
      confirmation screen, so this can't be missed silently - but the values
      themselves still need to be filled in by hand; nothing fixes this
      automatically.

## 3. Done in this pass (deploy-prep review) - nothing left to do here

- [x] Verified both cron routes (`/api/cron/class-reminders`,
      `/api/cron/admin-notifications`) reject every request without a matching
      `Authorization: Bearer <CRON_SECRET>` header (401), including when
      `CRON_SECRET` itself is unset - they fail closed, not open. Confirmed
      `?dry=1` only counts (no claim, no send) by tracing the code and testing
      locally with a dummy secret.
- [x] Added security headers (`X-Frame-Options: DENY`,
      `X-Content-Type-Options: nosniff`,
      `Referrer-Policy: strict-origin-when-cross-origin`,
      `Permissions-Policy: camera=(), microphone=(), geolocation=()`) in
      `next.config.ts`. No CSP was added - this app calls Supabase from the
      browser and a CSP tight enough to matter would need constant upkeep.
- [x] Added `/login`, `/sign-up`, `/forgot-password`, `/reset-password` to the
      `robots.ts` disallow list (checkout/cart/admin/dashboard/etc. were
      already there).
- [x] Confirmed the Supabase service-role key (`SUPABASE_SERVICE_ROLE_KEY`) is
      only ever read in `src/lib/supabase/admin.ts`, which is guarded by
      `import 'server-only'`, and every file that imports it is a server
      file (API route or server component) - never reachable from the
      browser bundle.
- [x] Cross-checked every `process.env.*` used under `src/` against
      `.env.example` - all 9 are documented there and nothing is missing in
      either direction.
- [x] `npm ci`, `npm run lint`, `npm run build`, and `npm audit` all pass
      clean on this branch.

## 4. Security (from an earlier pass's review - see that PR/commit description for the full writeup)

- [ ] Confirm the live RLS policy on `profiles` restricts INSERT/UPDATE to
      `auth.uid() = id`. `account-profile.tsx` upserts a profile row client-side
      using the signed-in user's own id, but no policy for this exists in any SQL
      file in this repo - it must already exist directly in the dashboard. If it
      doesn't, any authenticated user could overwrite another user's profile.
- [ ] Confirm the live RLS policy on `session_requests` allows public INSERT
      (the private-sessions request form has no login requirement) - same
      situation, not captured in any repo file.

## 5. Final pass

- [ ] Click through login, logout, and an `/admin` page while logged in as a
      non-admin, to confirm route protection still behaves as expected on the
      production build (see this branch's proxy.ts migration).
- [ ] Place a real test booking, course purchase, and shop order end-to-end on
      the production domain once DNS is live, then delete that test data
      afterward (see the cleanup step above).
- [ ] Run `npm audit` again right before launch. The critical Next.js RCE and the
      high-severity zod DoS that affected earlier versions are fixed as of
      `next@16.4.3` and `zod@4.6.7` (both upgraded on `feature/security-bump`,
      regression-tested against the payment/booking flow) - `npm audit` reports
      zero vulnerabilities as of that upgrade. Still worth re-running right
      before launch in case a new advisory has landed since.

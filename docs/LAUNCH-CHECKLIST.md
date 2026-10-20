# Launch checklist

Manual steps to do in dashboards (Supabase, Resend, DNS/host) before the site goes live.
Nothing here is code - this is a checklist for you to work through, in roughly this order.

## 1. Domain and environment variables

- [ ] Point the real domain at the deployment (DNS).
- [ ] Set `NEXT_PUBLIC_SITE_URL` in the production environment to the real domain,
      e.g. `https://ahlamspace.com` (no trailing slash). It currently falls back to
      `http://localhost:3000`, which would make SEO tags, the sitemap, and
      `robots.txt` point at localhost if left unset.
- [ ] Double-check every variable in `.env.example` is set in production with real
      values (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
      `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`,
      `ADMIN_NOTIFY_EMAIL`, `NEXT_PUBLIC_SITE_URL`).

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
- [ ] **Replace the business email placeholder.** `src/app/api/contact/route.ts`
      has `const businessEmail = 'nmi.ahlam@gmail.com' // TODO: replace with the
      real business email address.` - update it to the address that should
      actually receive contact-form messages.
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
- [ ] **Confirm every SQL file that's been written but not yet run is actually
      run**, in order, in the SQL editor: `supabase/admin-payments.sql`,
      `supabase/admin-sessions.sql`, and any others added since. The security
      review in this same pass found that `classes`, `class_sessions`, and
      `courses` only get admin-only write protection once
      `admin-sessions.sql` has actually been run - the client-side admin pages
      that write to those tables assume it has been.
- [ ] **Remove test users, orders, and bookings** created while building and
      testing the site - check `auth.users`, `profiles`, `bookings`, `orders`,
      `order_items`, `course_purchases`, and `session_requests` for anything that
      isn't real. `seed-real-content.sql` is the real catalog seed, not test data -
      leave that one alone.
- [ ] **Fill in the real bank transfer details.** `src/lib/bank-details.ts` still
      has placeholder `bankName`/`accountNumber` values ("اسم البنك", "رقم الحساب /
      IBAN") - every bank-transfer confirmation screen in the app shows these
      verbatim to customers.

## 3. Security (from this pass's review - see the PR/commit description for the full writeup)

- [ ] Confirm the live RLS policy on `profiles` restricts INSERT/UPDATE to
      `auth.uid() = id`. `account-profile.tsx` upserts a profile row client-side
      using the signed-in user's own id, but no policy for this exists in any SQL
      file in this repo - it must already exist directly in the dashboard. If it
      doesn't, any authenticated user could overwrite another user's profile.
- [ ] Confirm the live RLS policy on `session_requests` allows public INSERT
      (the private-sessions request form has no login requirement) - same
      situation, not captured in any repo file.

## 4. Final pass

- [ ] Click through login, logout, and an `/admin` page while logged in as a
      non-admin, to confirm route protection still behaves as expected on the
      production build (see this branch's proxy.ts migration).
- [ ] Place a real test booking, course purchase, and shop order end-to-end on
      the production domain once DNS is live, then delete that test data
      afterward (see the cleanup step above).
- [ ] Run `npm audit` again right before launch - the critical Next.js CVE fixed
      in `next@16.4.0` was deliberately not force-upgraded during this pass (it's
      outside this project's pinned version range and needs its own testing
      pass); decide whether to take that upgrade before going live.

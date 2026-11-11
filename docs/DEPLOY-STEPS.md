# Deploy steps (first production launch)

The exact order of operations for taking this repo live on Vercel. Written against this
repo's actual files and routes - not a generic Vercel tutorial. See also
`docs/LAUNCH-CHECKLIST.md` (what to verify/fix) and `docs/PRODUCTION-SMOKE-TEST.md` (what
to click through after each deploy).

## 1. Vercel project setup

1. Import this GitHub repo into a new Vercel project (Framework Preset: Next.js - detected
   automatically from `next.config.ts`).
2. Do **not** deploy yet - set the environment variables first (step 3), or the first build
   will fail/misbehave (missing Supabase env vars fail the build; a missing
   `NEXT_PUBLIC_SITE_URL` silently falls back to `http://localhost:3000` in SEO tags,
   `robots.txt`, and `sitemap.xml`, which you don't want live).
3. `vercel.json` at the repo root already declares both cron jobs
   (`/api/cron/class-reminders` hourly, `/api/cron/admin-notifications` every 10 minutes -
   hourly is enough resolution for a 24h-ahead reminder window, since it sends within at
   most ~1h of a booking first becoming due; the admin digest runs more often since it's
   effectively "how fast does the owner hear about a new booking/order") -
   Vercel picks these up automatically from the repo, nothing to configure in the
   dashboard for the crons themselves beyond the `CRON_SECRET` env var (step 3 below).
   **Confirm your Vercel plan tier supports this schedule first** - the Hobby plan
   limits Cron Jobs to once per day as of Vercel's current pricing; both schedules here
   need at least a Pro plan to actually fire as written.

## 2. Supabase Auth URL configuration

Before the first real sign-up, in the Supabase dashboard (Authentication > URL
Configuration):

1. Set **Site URL** to the real production domain (e.g. `https://ahlamspace.com`).
2. Add every domain that will actually serve the app to **Redirect URLs**: the production
   domain, and if you want password-reset/confirmation links to work from Vercel preview
   deployments too, the preview URL pattern as well (e.g. `https://*.vercel.app/**`, or
   just the specific preview domains you use).

Without this, the links in sign-up confirmation and password-reset emails point at
whatever URL was configured during development (likely `localhost`) and send real users
nowhere useful.

Also while here: confirm **Authentication > Providers > Email > Confirm email** is turned
**on** before launch (it was intentionally left off during development for faster manual
testing - see `docs/LAUNCH-CHECKLIST.md`).

## 3. Resend (email)

This app calls Resend's own SDK directly (`src/lib/email/mailer.ts`, `new Resend(apiKey)`)
- there is no separate SMTP configuration to set up, only the API key and a verified
sending domain:

1. In the Resend dashboard: **Domains > Add Domain**, enter the real domain, and add the
   SPF/DKIM (and DMARC if shown) DNS records it gives you at your DNS host/registrar.
2. Wait for the domain status to show **Verified** (can take minutes to hours for DNS to
   propagate) - Resend rejects sends from an unverified domain.
3. Once verified, set `EMAIL_FROM` (step 4) to an address on that domain, e.g.
   `Ahlam Space <notifications@ahlamspace.com>`.
4. `src/app/api/contact/route.ts` (the contact form) reads this same `EMAIL_FROM` too, so
   setting it covers the contact form as well as both cron emails - nothing extra to do
   here. If `EMAIL_FROM` is ever unset, the contact form still works, just falling back to
   Resend's shared `onboarding@resend.dev` sender.

## 4. Environment variables

Set all of these in Vercel (Project Settings > Environment Variables), for Production (and
Preview, if you want preview deployments to work against the same Supabase project -
otherwise create a second Supabase project for previews and use its values there instead).

| Variable | Where the value comes from | Secret? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard > Project Settings > API | No (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard > Project Settings > API | No (public - RLS-governed) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard > Project Settings > API | **Yes** - server-only, never prefix with `NEXT_PUBLIC_` |
| `RESEND_API_KEY` | Resend dashboard > API Keys | **Yes** |
| `EMAIL_FROM` | An address on your Resend-verified domain (step 3) | No (not sensitive, but required for both crons; contact form falls back to Resend's shared sender if unset) |
| `ADMIN_NOTIFY_EMAIL` | Your own choice; defaults to `nmi.ahlam@gmail.com` if unset | No - optional |
| `CONTACT_TO_EMAIL` | Your own choice; defaults to `nmi.ahlam@gmail.com` if unset | No - optional |
| `CRON_SECRET` | Generate with `openssl rand -hex 32` | **Yes** |
| `NEXT_PUBLIC_SITE_URL` | The real production domain, no trailing slash, e.g. `https://ahlamspace.com` | No (public) - falls back to `http://localhost:3000` if unset |

`EMAIL_FROM` and `RESEND_API_KEY` are both required for the contact form and both cron
jobs to send anything - without them, the contact form's POST returns 500 and both cron
routes return `mailer_not_configured`.

Redeploy after setting these (Vercel does not retroactively apply new env vars to an
already-built deployment).

## 5. Custom domain

1. Vercel project > Settings > Domains > add the real domain.
2. Point its DNS at Vercel per the records Vercel shows (A/CNAME, depending on whether it's
   an apex domain or subdomain).
3. Wait for Vercel to show the domain as valid/SSL issued.
4. Re-confirm `NEXT_PUBLIC_SITE_URL` (step 4) and the Supabase Auth URLs (step 2) both use
   this exact final domain, not a placeholder or the `.vercel.app` URL.

## 6. First cron check after deploy

Vercel Cron calls each job's URL with `Authorization: Bearer <CRON_SECRET>` on the
schedule in `vercel.json`. To verify without waiting for the schedule or sending anything
real, call each route's dry-run manually once, from your own machine, using the real
`CRON_SECRET` you set in step 4:

```bash
curl -s -w "\n%{http_code}\n" "https://<your-domain>/api/cron/class-reminders?dry=1" \
  -H "Authorization: Bearer <CRON_SECRET>"
curl -s -w "\n%{http_code}\n" "https://<your-domain>/api/cron/admin-notifications?dry=1" \
  -H "Authorization: Bearer <CRON_SECRET>"
```

Expect `200` and a JSON body like `{"dry":true,"due":0}` /
`{"dry":true,"pending":0}` from each (the counts will be non-zero once there's real
activity). A `401` means `CRON_SECRET` doesn't match what's set in Vercel - check for a
copy-paste mismatch. Also check Vercel's Cron tab (Project > Cron Jobs) after the first
scheduled run actually fires, to confirm it shows a real `200` response there too, not
just from your manual dry-run call.

Before relying on either cron job for real, also run `supabase/class-reminders.sql` in the
Supabase SQL editor if you haven't already - both routes fail every run without the
columns/functions/table it creates (see `docs/LAUNCH-CHECKLIST.md`).

## 7. Rollback

If a deployment causes a problem in production:

1. Vercel dashboard > your project > **Deployments**.
2. Find the last known-good deployment (the one before the problematic one).
3. Open its "..." menu > **Promote to Production** (wording may show as "Redeploy" on
   older Vercel UI versions).
4. This immediately points the production domain back at that build - no rebuild needed,
   takes effect in seconds.
5. Separately, fix the issue on a branch, open a PR, and redeploy forward once it's
   verified - don't leave the project pinned to an old deployment long-term.

Note: rolling back the deployment does **not** roll back any Supabase migration
(`supabase/*.sql` file) you may have run around the same time. If the problem deployment
came with a SQL change, you may need to manually reverse that SQL change too - these
`.sql` files are not written to be auto-reversible, so check what was actually run before
assuming a Vercel rollback alone fixes a bad release.

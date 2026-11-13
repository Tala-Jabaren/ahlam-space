# Email notifications

Every email this app sends: what triggers it, who gets it, and what the subject line
says. Written against this repo's actual files, not a plan - update this table whenever
an email is added, removed, or its trigger changes.

`REMINDER_HOURS = 12` (`src/lib/reminder-constants.ts`) - how many hours before a group
class or an approved trip's meeting time its automatic reminder goes out. No quiet
hours: the cron runs hourly regardless of time of day. All reminder/trip time math uses
`Asia/Hebron`, not the server's UTC or `Asia/Jerusalem` (the two aren't always the same
offset - see the comment at the top of `supabase/class-reminders.sql`).

## Customer-facing emails

| Trigger | Recipient | Subject | Sender | File |
|---|---|---|---|---|
| A confirmed, paid class booking starts within `REMINDER_HOURS` (hourly cron) | The booking's own member | تذكير بحصتك القادمة مع أحلام سبيس | `EMAIL_FROM` | `src/lib/email/class-reminder-email.ts` |
| An approved trip application's trip has a `meeting_time` set, and it's within `REMINDER_HOURS` of start (hourly cron) | The applicant | تذكير بمشوارك القادم مع أحلام سبيس | `EMAIL_FROM` | `src/lib/email/trip-reminder-email.ts` |
| Admin approves a trip application | The applicant | تم تأكيد طلبك، تقدري تيجي معنا | `EMAIL_FROM` | `src/lib/email/trip-application-email.ts` (`buildTripApprovedEmail`) |
| Admin declines a trip application | The applicant | بخصوص طلب المشاركة بمشوار &lt;title&gt; | `EMAIL_FROM` | `src/lib/email/trip-application-email.ts` (`buildTripDeclinedEmail`) |
| Admin sends a message to a trip's participants | Each APPROVED applicant, one separate email per recipient | whatever subject the admin typed | `EMAIL_FROM` | `src/lib/email/trip-participant-message-email.ts` |

Not sent, by design (per the brief this file was written against):
- **Individual session requests** - no reminder (Ahlam follows up by phone/contact, there's no scheduled date/time on `session_requests` at all).
- **Course purchases** - no reminder (on-demand content, nothing scheduled).
- **Trip application submitted** - no email; the on-screen success message after applying already says she'll get an email once Ahlam confirms (see `src/components/trips/application-form.tsx`).
- **Trip application withdrawn** - no email.
- **Trip waitlisted** - no email (only approved/declined trigger one; the member still sees the status change on `/trips`).
- **Bookings/orders/course purchases confirmation** - no email at all for these three flows; payment/bank instructions are shown on-screen only (`src/components/payment-confirmation-block.tsx`), pointed at the shared `BANK` config (`src/content/site-contact.ts`).

## Owner-facing emails

One separate email per event (no digest, no batching) - `admin_notification_queue` /
`claim_admin_notifications` still claim rows in batches of up to 50 per run for
reliability/retries (max 5 attempts per row before it's left unsent), but the cron loops
over its claimed batch and sends one email per row, one at a time.

| Event kind | Subject | Recipient |
|---|---|---|
| New class booking | حجز جديد | `ADMIN_NOTIFY_EMAIL` |
| New shop order | طلب جديد من المتجر | `ADMIN_NOTIFY_EMAIL` |
| New individual-session request | طلب جلسة فردية | `ADMIN_NOTIFY_EMAIL` |
| New course purchase | شراء كورس | `ADMIN_NOTIFY_EMAIL` |
| New trip application | طلب مشوار جديد | `ADMIN_NOTIFY_EMAIL` |

`ADMIN_NOTIFY_EMAIL` defaults to `nmi.ahlam@gmail.com` if unset - unchanged by this
pass on purpose (see the "SUPPORT_EMAIL" note below).

## The contact form

`POST /api/contact` sends one email per submission to `CONTACT_TO_EMAIL` (default
`nmi.ahlam@gmail.com`), sender `EMAIL_FROM`. Unrelated to everything above - it's a
direct form-to-inbox relay, not an event in `admin_notification_queue`.

## Cron schedule (`vercel.json`)

| Route | Schedule | Covers |
|---|---|---|
| `/api/cron/class-reminders` | hourly (`0 * * * *`) | class reminders AND trip reminders (one route, both kinds - see the route file) |
| `/api/cron/admin-notifications` | every 5 minutes (`*/5 * * * *`) | the 5 owner-facing event kinds above |

Both support `?dry=1` (zero writes, zero sends, counts only) and share
`src/lib/cron-auth.ts` for a timing-safe `CRON_SECRET` check.

## SUPPORT_EMAIL vs ADMIN_NOTIFY_EMAIL/CONTACT_TO_EMAIL

`SUPPORT_EMAIL` (`ahlamspace@ahlamspace.com`, `src/content/site-contact.ts`) is used
**only** where a contact address is shown publicly: the privacy policy's data-deletion
line, the `/contact` page, and the shared customer-email footer
(`emailFooterHtml`/`emailFooterText` in `src/lib/email/html.ts`). It is deliberately
**not** the default for `ADMIN_NOTIFY_EMAIL` or `CONTACT_TO_EMAIL` - those stay
`nmi.ahlam@gmail.com`, the inbox the owner actually monitors for operational
notifications.

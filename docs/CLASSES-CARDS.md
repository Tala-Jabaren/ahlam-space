# Shared class cards

Both `/classes` and `/member-schedule` render `src/components/classes/class-card.tsx`.
The public catalog still groups sessions under their class. The member page keeps
its existing query window and the unchanged `getScheduleWindow` / `sessionsInWindow`
helpers. No schedule, payment, auth, capacity or database function was rewritten.

## Changed files

```text
src/app/(public)/classes/page.tsx
src/app/(member)/member-schedule/page.tsx
src/app/(public)/schedule/book-session-button.tsx
src/app/(public)/classes/cancel-booking.ts
src/components/classes/class-card.tsx
src/components/classes/class-card.module.css
src/components/classes/cancel-registration-button.tsx
src/components/classes/features.ts
src/components/classes/types.ts
src/lib/class-cards.ts
src/i18n/ar.ts
src/i18n/en.ts
docs/CLASSES-CARDS.md
```

## Data and fallbacks

- Session data supplies date, start/end times, status, location, capacity and
  booked_count; its class join supplies name, category and price.
- The current types/queries have no class/session image column. Both lists reuse
  the existing `/member/yoga-class.png`, `fitness-class.png` and `dance-class.png`
  category images. Unknown categories and image-load errors use a sage/blue
  gradient with a decorative leaf. Category labels are omitted when absent.
- There is no instructor name/avatar field. The existing translated instructor
  name (`memberSchedule.instructorName`, Ahlam) and its initial are reused.
- Price exists on classes. A missing/null/nonfinite price is omitted, never
  replaced by a displayed zero. A genuine numeric zero remains a real price.
- Dates use Asia/Hebron; times retain the site's 24-hour HH:mm convention and
  prices use ILS. Stored class names remain unchanged.
- Each logged-in user's active bookings are read with an explicit user_id filter.
  Expired pending holds use the same active-hold interpretation as the existing
  attendee UI. If registration-state reads fail, the card offers a retry instead
  of presenting an unverified registration action.

## Booking and cancellation

`BookSessionButton` retains its existing authentication checks, safe relative
returnTo, `book_class_session` arguments, reference lookup, error codes and
pending/unpaid bank-transfer behavior. Its only additions are optional label/style
props and a presentation callback after success. The shared card displays the
same `PaymentConfirmationBlock` in a native dialog and updates the registration
badge. Closing refreshes server data; Escape and keyboard focus are supported.

`CANCEL_ENABLED` is **false** in `src/components/classes/features.ts`. Registered
cards therefore show the status and a contact note linking to the existing
`WHATSAPP_URL` from `src/content/site-contact.ts`. No new cancellation control can
call a database function. The existing My Bookings cancellation implementation
is outside this change and is not reused or modified.

The new `cancelBooking(bookingId)` server action always returns the typed
`NOT_IMPLEMENTED` result and has no DB imports/calls. The future UI includes a
confirmation dialog, loading, success, not-implemented, forbidden, too-late and
generic-error messages. Do not enable it before the secure backend is reviewed.
That backend must recheck ownership and the >12-hour cutoff. The display decision
is currently computed on the server from the Hebron session timestamp: exactly
12 hours is too late; 12 hours plus 1ms is eligible. No browser clock decides this.

## Verification

- `npm run lint`, `npx tsc --noEmit` and `npm run build` passed.
- Playwright / headless Edge exercised the actual Next production app, real
  Supabase client and server code against a local in-memory HTTP fixture. The
  owner explicitly chose local verification instead of a real test account.
  **No real Supabase booking, SQL, cancellation or payment confirmation ran.**
- At 390px and 1280px, both routes and both languages were checked/screenshot for:
  available, full, registered pending, registered confirmed, registered within
  12 hours, and missing-image/missing-price states (48 state screenshots).
- The local E2E check clicked Register, observed one unchanged RPC call, displayed
  the fixture's `AS-4242` reference, verified pending/unpaid/bank_transfer, then
  reloaded both lists and saw the registered state. Anonymous registration went
  to `/login?returnTo=/classes?book=...` with the nested URL safely encoded.
- Verified visible keyboard focus, no horizontal overflow, 16:9 media, reduced
  motion, desktop scroll animation, and hiding past/cancelled sessions. A session
  outside the member's two-week window stays absent there while the public list
  keeps its original broader filter.
- Verified 2 columns at 640px and 3 at 1024px in both lists, aligned available/full
  buttons, image-error fallback, the existing member login gate, automatic booking
  resumption via `?book=...`, and Escape closing the payment dialog.
- Server helper checks cover winter/summer Hebron offsets, the exact 12-hour
  boundary, missing values, the no-DB stub, unchanged booking handler through
  success, and the unchanged two-week helper (including consecutive Sundays).

Local review artifacts (not committed):
`C:/Users/TALA/AppData/Local/Temp/ahlam-classes-cards-qa/index.html`,
`report.json`, `unit.cjs`, and `screenshots/`.

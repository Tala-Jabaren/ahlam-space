# Admin action home and mobile navigation (PR 2)

Started from origin/main only after PR 1 (#78) merged as c78de5d. This PR is review-only; do not merge automatically. No SQL was run or added/changed here.

## Owner-facing changes

- Home shows five action cards: unpaid class payments, unpaid lecture/meditation payments, pending shop payments, new private-session requests, and trip applications pending review. Counts use existing business status fields, never notification `seen_at`/`sent_at`. Zero cards say «كل شي تمام»; unknown/error counts remain a dash with an Arabic explanation.
- Counts and weekly sessions are read on the server after the existing admin guard, using the existing server-only admin client. No health/comfort answers are loaded for home or the pending-trip overview.
- «حصص هذا الأسبوع» lists Jerusalem calendar Sunday through Saturday, date/time, booked/capacity, and the existing attendee page. No schedule generation or booking logic changes.
- Quick actions: «إضافة حصة» opens the EXISTING create-class form via `?tab=types&new=1`; «تأكيد دفعة» opens Classes > Payments. Other payment domains are directly reachable from their action cards.
- Pending request/trip cards land on focused pending lists. Existing status/review controls, payment confirmations and RPCs remain unchanged.
- Under 1024px, bottom navigation is الرئيسية / الحصص / المتجر / المزيد. More opens a bottom sheet containing the other five existing sections plus the existing profile/back/logout row. Desktop retains the 260px sidebar.
- The sheet reuses the native modal, focus trap, Escape/backdrop/X dismissal, return focus, route/resize close and scroll lock. Safe-area padding and extra content space keep final actions above the fixed bar. Motion respects reduced-motion preferences.
- Customers are read-only cards on phone/tablet, preserving all table fields, sorting/search/pagination/export and detail context. Desktop retains the table. Attendee cards extend through tablet widths, with the same filtering/contact/export behavior and one visually primary contact action.
- Mobile controls have 44px minimum hit targets; links/tabs remain logical for RTL/LTR. Section tabs keep their existing horizontal scroll.

## Validation

- `npm run lint`, `npx tsc --noEmit` and final `npm run build` passed after rebase. Next initially stopped with its existing security reminder; the immediate retry exited 0 with the advisory still visible.
- Playwright/Edge with synthetic local-only auth/data: 360x800, 393x852, 768x1024, 1024x768, 1440x900 in Arabic and English layout.
- Verified that marking every notification seen leaves home action counts unchanged. Zero counts and partial count errors show the correct calm/unknown states.
- Checked week attendee URLs, quick-add form opening, focused pending links, active primary/More routes, five-link sheet, keyboard cycling/Escape, route/resize close, no scroll lock leak/layout shift/page overflow, and final attendee cards clear the bottom bar.
- Existing logout still clears cart/session in both languages. Anonymous and non-admin home access redirects to login.
- Jerusalem Sunday midnight boundaries tested for winter and summer offsets; server host timezone does not set the displayed week.
- Normal/reduced motion, initial X focus, X/backdrop dismissal, keyboard focus above the fixed bar and 44px logo target passed. Home action counts also worked when the notification seen_at column was unavailable.
- No live database mutations, SQL, or outgoing emails/messages were used in testing. Contact links were inspected, not sent.

## Screenshots

| Size | Arabic | English layout |
| --- | --- | --- |
| 360 phone | [home](ar-360-home.jpg), [More](ar-360-more.jpg), [customers](ar-360-customer-cards.jpg), [attendees](ar-360-attendee-cards.jpg) | [home](en-360-home.jpg), [More](en-360-more.jpg), [customers](en-360-customer-cards.jpg), [attendees](en-360-attendee-cards.jpg) |
| 393 phone | [home](ar-393-home.jpg), [More](ar-393-more.jpg), [customers](ar-393-customer-cards.jpg), [attendees](ar-393-attendee-cards.jpg) | [home](en-393-home.jpg), [More](en-393-more.jpg), [customers](en-393-customer-cards.jpg), [attendees](en-393-attendee-cards.jpg) |
| 768 tablet | [home](ar-768-home.jpg), [More](ar-768-more.jpg), [customers](ar-768-customer-cards.jpg), [attendees](ar-768-attendee-cards.jpg) | [home](en-768-home.jpg), [More](en-768-more.jpg), [customers](en-768-customer-cards.jpg), [attendees](en-768-attendee-cards.jpg) |
| 1024 desktop | [home](ar-1024-desktop.jpg) | [home](en-1024-desktop.jpg) |
| 1440 desktop | [home](ar-1440-desktop.jpg) | [home](en-1440-desktop.jpg) |

[Zero state](ar-393-home-zero.jpg), [partial count failure](ar-393-home-count-error.jpg), [quick-add form](ar-393-add-class-shortcut.jpg).

## Review notes

Admin content stays Arabic; existing sidebar/bottom-navigation chrome follows the language cookie and mirrors correctly. Customer data/provider, exports, booking/payment logic, RPCs, RLS, cron, email and public pages are unchanged. No dependencies added.

The current Next 16.4.3 dependency emits its pre-existing security upgrade reminder. A security upgrade should be reviewed separately; this PR does not suppress checks or change dependencies. The final build retry result is recorded in the PR.

Notifications still require the separately reviewed seen_at SQL from PR 1 to display unread badges; the action home does not require that column. A real-session/database smoke check remains appropriate before release.

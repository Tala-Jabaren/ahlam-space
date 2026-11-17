# Admin domain sections (PR 1)

## Navigation and routes

The existing sidebar configuration remains the single source of navigation groups. Order: Home, Classes, Private sessions, Lectures & meditations, Trips, Shop, Customers, Reviews. The profile/back-to-site/logout row is unchanged.

| Domain | Tabs / existing content |
| --- | --- |
| `/admin/classes` | `sessions` (default), `types` (create/edit/image/recurrence), `payments` (booking payments) |
| `/admin/requests` | Existing private-session requests, explicitly open each request |
| `/admin/courses` | `content` (default), `payments` (course purchases); page title is المحاضرات والتأملات |
| `/admin/products` | `products` (default), `orders`, `payments` (shop payments) |
| `/admin/trips` | Existing trips and trip detail pages. No payment tab: current trips schema has no price/payment flow. |
| `/admin/customers`, `/admin/reviews` | Unchanged |

Legacy `/admin/payments` redirects to Classes > Payments. Legacy `/admin/orders` redirects to Shop > Orders. Existing home cards now link to domain tabs; the state-based home/mobile redesign is intentionally deferred to PR 2.

The former server page bodies are reused in `classes-content`, `courses-content`, `products-content`, `orders-content` and `domain-payments`. Existing query projections, payment confirmation/dialog/RPC arguments, stock/cancellation controls, class creation and recurrence logic are preserved. Class creation is placed under Types. No booking/payment RPC or RLS change.

## Notifications / manual SQL review

Review **[supabase/admin-notification-seen.sql](../../../../../supabase/admin-notification-seen.sql)**. It has NOT been executed. It only adds nullable `seen_at` and an index for unseen counts; no policy/grant/RPC changes.

Queue retention audit: `claim_admin_notifications` sets `sent_at`/attempts; failed sends reset `sent_at`. Successfully sent and skipped rows stay in the queue. This PR does not alter cron, sending, retry behavior or retention. Existing manual cleanup SQL scripts remain unchanged.

Existing queue RLS denies all anon/authenticated reads and writes, including an authenticated admin. Guarded server-only reads/actions therefore call the existing `getAdminSession()` role check before using the existing service-role client. Only integer counts reach the sidebar; no key/queue contents reach client bundles. The action validates kind/UUID and updates only `kind + ref_id + seen_at IS NULL`.

Event mapping:

- `booking` -> Classes / Payments.
- `course_purchase` -> Lectures & meditations / Payments.
- `order` -> Shop / Orders; both Orders and Payments tabs show the same unseen count, not independent totals.
- `session_request` -> Private sessions.
- `trip_application` -> Trips; the application ID resolves to its parent trip on the guarded server.

Email targets are fetched by their exact ID, independently of list row limits, with a link back to the full list. A list/section visit does not mark any row. Explicitly expanding one item (or following its email deep link) calls the admin-checked action for that item only. Counts refresh after success; zero badges disappear. Collapsing/reopening permits retry after a failed write. Payment state never derives from `seen_at`.

Before the SQL runs, missing-column errors hide badges and disable seen writes while content, details and existing actions remain available. Migration does not backfill history: old queue rows start unseen. `seen_at` is shared across admins as requested, not a per-admin read receipt. Old queue records whose referenced item was deleted may need owner-reviewed cleanup; this PR does not silently discard them.

## Validation

- `npm run lint`, `npx tsc --noEmit` and the final `npm run build` passed after rebasing onto current main.
- Next 16.4.3 initially stopped the build with its security-version upgrade reminder; the final retry exited 0 while still reporting the advisory. A security upgrade is recommended and must be reviewed separately; dependencies are unchanged in this PR.
- Playwright/Edge against the production build and local-only auth/data fixtures: 1440x900, 1024x768, 768x1024, 393x852 in Arabic/English layout; supplemental 360px phone check. No horizontal page overflow or client errors.
- All five event kinds: sent rows still count as unseen, exact one-item marking, siblings untouched, zero badges hidden, specific email/item routes open the right item.
- Replayed seen action POSTs were rejected for anonymous/non-admin sessions and invalid kind/UUID, with zero queue updates.
- Existing `admin_confirm_payment` dialog/RPC tested for booking/course/order with identical `p_kind`/`p_id`; cancelling the dialog sends nothing.
- Missing-column before render and after render: no page failure; a failed write shows Arabic feedback and reopening retries safely.
- Email template tests: all five exact deep links, paid/unpaid target visibility, HTML escaping, no email sent.
- No SQL or live database writes were run. Live Supabase validation must wait for owner review/application of the SQL.

## Screenshots

| Viewport | Arabic | English layout |
| --- | --- | --- |
| 1440 desktop | [Payments](ar-1440-classes-payments.jpg) | [Payments](en-1440-classes-payments.jpg) |
| 1024 desktop | [Payments](ar-1024-classes-payments.jpg) | [Payments](en-1024-classes-payments.jpg) |
| 768 tablet | [Payments](ar-768-classes-payments.jpg), [drawer](ar-768-navigation.jpg) | [Payments](en-768-classes-payments.jpg), [drawer](en-768-navigation.jpg) |
| 393 phone | [Payments](ar-393-classes-payments.jpg), [drawer](ar-393-navigation.jpg) | [Payments](en-393-classes-payments.jpg), [drawer](en-393-navigation.jpg) |
| 393 courses | [Payments](ar-393-courses-payments.jpg) | [Payments](en-393-courses-payments.jpg) |
| 393 shop | [Orders](ar-393-shop-orders.jpg) | [Orders](en-393-shop-orders.jpg) |
| 393 private sessions | [Requests](ar-393-requests.jpg) | [Requests](en-393-requests.jpg) |

[Deep-linked order before migration](ar-393-before-seen-migration.jpg).

The admin content remains Arabic; the existing locale-aware sidebar and start-side layout still mirror for English. All screenshot data is synthetic.

## After owner runs the SQL

1. With a real admin, create a test event in each existing business flow; confirm its section/tab badge increments whether email has been sent or not.
2. Open a section without opening items; counts must stay unchanged.
3. Expand one item; only its queue row gets `seen_at`, its sibling stays unread, and sidebar/tab counts drop once.
4. Follow the owner's email link for each type, including a paid payment and a trip application; only that item opens/marks seen.
5. Confirm payment through the existing dialog; verify the original payment/access behavior is unchanged.
6. Verify a non-admin still cannot read or update queue rows, and unauthenticated admin routes redirect to login.

PR 2 (`feature/admin-home-mobile`) must branch from latest `origin/main` only after PR 1 is merged. No merge is authorized in this task.

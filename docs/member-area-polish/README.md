# Member Area Polish

Branch: `feature/member-area-polish`, created from `origin/main` at `8369eb7`.
PR only: no main push, merge, SQL execution, database changes or new dependencies.

## Audit

The `(member)` layout authenticates with the existing server Supabase session.
Its desktop sidebar and mobile bottom navigation previously pointed to:

| Item | Before | After |
| --- | --- | --- |
| Classes | `/member-schedule` | unchanged |
| My bookings | `/bookings` | unchanged |
| My orders | `/orders` | unchanged, redesigned |
| Lectures | `/courses` (public layout) | `/member/courses` |
| Trips | `/trips` | unchanged |
| Shop | `/shop` (public layout) | `/member/shop` |
| Account | `/account` | unchanged |

The logo, return-to-site link, help link and logout retain their original
destinations. Member trip pages/components were not edited.

The public courses catalog queried active course metadata and the current user's
purchases. CourseCard already shared its card UI. The detail page checked paid
video/article purchases, and used the existing meditation access-status RPC and
expiry window for audio. Those checks and signing rules were preserved, not
reimplemented. The public shop queried active products with variants, while the
product page queried its own active product and variants. Cart state lives in
the existing root CartProvider/localStorage; checkout calls the existing
place_order RPC after a fresh auth.getUser().

My Orders already filtered by the authenticated user's ID, newest first. Its
old UI showed UUIDs and USD prices. It now shows references, friendly Jerusalem
dates, Arabic status badges, item images/quantities, ILS totals and next steps.
The order query only adds the existing products.image_url field. Null references
use a human fallback rather than a UUID. Guest orders are not included.

The spacing issue was cumulative: MainContent reserved a fixed 96/112px for a
fixed floating header, then pages added 40-64px or more of top padding. On
phones the header wrapped taller than that fixed allowance, sometimes causing
overlap instead. Auth forms were vertically centered, and the About hero also
vertically centered text in a tall minimum-height section.

## Routes and Reuse

New protected member routes, all under the existing member auth layout:

- `/member/courses`
- `/member/courses/[id]`
- `/member/shop`
- `/member/shop/[id]`
- `/member/cart`
- `/member/checkout`

`src/components/commerce/` contains one implementation of each catalog/detail,
cart and checkout view. Public pages are thin entry points, preserving their
original URLs, metadata generators and canonical paths. Member entry points
render the same implementations with member-scoped destinations. New member
commerce pages are noindex. Sitemap and public SEO code were not edited.

ExperienceRoutes/ExperienceProvider are navigation-only: defaults remain public;
the member layout provides member routes and the existing i18n dictionary.
Course-card links, detail redirects/back links, purchase returnTo, product
links, cart checkout links, empty-cart redirects and the cart dock use that
scope. The member header has a cart link with a count. The dock sits above
mobile navigation and is omitted on the member cart/checkout pages. Member
checkout confirmation stays in that layout; its existing My Orders action
goes to `/orders`. Guest checkout still stays on the public confirmation.
Member consent-policy links open a separate tab, preserving the checkout tab.

The public `/courses` and `/shop` routes remain available, including to logged-in
visitors who deliberately browse the public site. Only member navigation is
rewired; no new automatic public-to-member redirects were introduced.

Bank instructions reuse PaymentConfirmationBlock and src/lib/bank-details.ts.
src/content/site-contact.ts did not exist at the branch point. No bank details
were hard-coded or changed. My Orders suppresses only that component's internal
admin placeholder warning; payment/reference handling is unchanged.

## Entry Spacing

- Public MainContent measures the actual non-home floating header height with
  ResizeObserver, adds its 16px inset and a 24px content gap, and removes the
  duplicate first-page top padding with a scoped CSS module.
- Member/admin content uses 24px on phones and 32px from the small breakpoint.
- Auth form cards begin 24px below the language-switcher region rather than
  being vertically centered. Form validation and redirects are unchanged.
- The About hero's initial text/image padding and tall centered container were
  reduced; no copy or media was changed on this branch.
- `/` gets neither the new class nor measured padding. globals.css, the public
  layout/footer, SiteHeader, home page and home components were not edited.
- Contact, trip, email/notification, cron, SQL and deployment files were not
  edited. Existing shared member/admin layout spacing applies consistently.

## Verification

Passed:

- `npm run lint`
- `npm exec tsc -- --noEmit`
- `npm run build` using the committed Next.js 16.4.3 lockfile
- `node tests/member-area-polish/source-contracts.mjs`
- Full Playwright browser suite against production builds and a local-only
  fake auth/REST service, not the live database

Source-contract checks compare the place_order payload, fresh-auth validation,
course-purchase insert, paid/expiry/signing logic and member auth guard against
main. They also verify protected paths have no diff.

At 390px and 1280px the browser suite clicks the member navigation through
catalog/detail, shop/product and orders, verifies desktop sidebar/mobile nav
remain present and the public header never appears, and captures screenshots.
It tests orders with all six real statuses and with no data; no UUID, raw status
or USD is shown. It tests a pending course purchase, denies unpaid video/article
access and expired audio, and checks member product -> cart -> checkout ->
confirmation -> My Orders. The guest flow still submits a null user ID and
guest details through the same bank-transfer RPC. No real purchase is created.

Spacing screenshots cover public Classes, Private Sessions, Login and Admin at
both widths. There is no body-level horizontal overflow. The home comparison
uses a main snapshot and identical fixture data with reduced motion; images
match at both widths with at most 1/255 channel rounding tolerance. Development
previews had intermittent streaming/cache errors, so the final full suite used
built production servers and passed with no client runtime errors.

## Screenshots

| View | Phone | Desktop |
| --- | --- | --- |
| Member courses | [390](screenshots/member-courses-390.png) | [1280](screenshots/member-courses-1280.png) |
| Course detail | [390](screenshots/member-course-detail-390.png) | [1280](screenshots/member-course-detail-1280.png) |
| Member shop | [390](screenshots/member-shop-390.png) | [1280](screenshots/member-shop-1280.png) |
| Product | [390](screenshots/member-product-390.png) | [1280](screenshots/member-product-1280.png) |
| Orders | [390](screenshots/member-orders-390.png) | [1280](screenshots/member-orders-1280.png) |
| Empty orders | [390](screenshots/member-orders-empty-390.png) | [1280](screenshots/member-orders-empty-1280.png) |
| Classes spacing | [390](screenshots/spacing-classes-390.png) | [1280](screenshots/spacing-classes-1280.png) |
| Private sessions spacing | [390](screenshots/spacing-private-sessions-390.png) | [1280](screenshots/spacing-private-sessions-1280.png) |
| Auth spacing | [390](screenshots/spacing-login-390.png) | [1280](screenshots/spacing-login-1280.png) |
| Admin spacing | [390](screenshots/spacing-admin-390.png) | [1280](screenshots/spacing-admin-1280.png) |
| Home main | [390](screenshots/home-main-390.png) | [1280](screenshots/home-main-1280.png) |
| Home branch | [390](screenshots/home-branch-390.png) | [1280](screenshots/home-branch-1280.png) |

Additional flow captures: [cart](screenshots/member-cart-1280.png),
[checkout](screenshots/member-checkout-1280.png),
[member confirmation](screenshots/member-confirmation-1280.png),
[guest checkout](screenshots/guest-checkout-390.png).

## Reproducing Browser Checks

Playwright was already available on the host; no package.json/lockfile changes
were made. Set PLAYWRIGHT_MODULE to an existing Playwright package directory if
it is not locally resolvable. sharp comes from the existing Next dependencies.

1. Run `node tests/member-area-polish/fixture.mjs` (127.0.0.1:4342).
2. For TEST BUILDS/PREVIEWS ONLY set NEXT_PUBLIC_SUPABASE_URL to
   http://127.0.0.1:4342, NEXT_PUBLIC_SUPABASE_ANON_KEY to test-anon-key, and
   SUPABASE_SERVICE_ROLE_KEY to test-service-key. Never use those values in a
   deployment or normal preview. Build/start the branch on port 3020.
3. Create an ignored snapshot of the branch-point main source and public
   assets, build/start it with the same local variables on port 3021. It must
   resolve the same installed lockfile dependencies. Keep temporary copies and
   generated output under .next so normal lint does not scan those copies.
4. Run `node tests/member-area-polish/browser.mjs` from the branch worktree.
   APP_URL, BASELINE_URL, FIXTURE_PORT and SCREENSHOT_DIR may override defaults.
5. Stop test services and restore the project's real environment afterward.

## Scope and Remaining Checks

No live Supabase integration, RLS changes or SQL runs were performed. Production
credentials should be used for an owner-led smoke test after review. Separate
bookings lists were not redesigned because they do not share the Orders page.
The existing sidebar search input was not turned into a new search feature.
The parallel home-redesign branch was not merged or modified.

The first stale local install warned about Next security; npm ci restored the
unchanged committed versions before final verification. npm ci still reported
seven moderate dependency advisories. Dependency upgrades and the pre-existing
conflict-marker text in main's .gitignore are outside this PR's scope.

## Changed Files

- Member layout, Orders page, and the seven new files under `(member)/member/`.
- Public courses/shop/cart/checkout entry points, CourseCard/purchase button,
  ShopCatalog, cart dock, MainContent and About hero spacing.
- Auth/admin layout wrappers, shared payment warning presentation flag.
- Nine commerce components, ExperienceRoutes, scoped page-rhythm CSS module.
- Three local verification scripts and this report/screenshots.

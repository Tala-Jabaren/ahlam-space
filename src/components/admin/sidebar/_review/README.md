# Admin sidebar review

Arabic and English screenshots captured with Playwright/Edge against an isolated local Supabase fixture. No live database mutations or SQL were run. Names, counts and the nested trip shown here are test data.

## Screenshots

| Viewport | Arabic | English |
| --- | --- | --- |
| 1440 x 900 desktop | [Sidebar](ar-1440-desktop.jpg) | [Sidebar](en-1440-desktop.jpg) |
| 1024 x 768 desktop | [Sidebar](ar-1024-desktop.jpg) | [Sidebar](en-1024-desktop.jpg) |
| 768 x 1024 closed | [Top bar](ar-768-closed.jpg) | [Top bar](en-768-closed.jpg) |
| 768 x 1024 open | [Drawer](ar-768-open.jpg) | [Drawer](en-768-open.jpg) |
| 393 x 852 closed | [Top bar](ar-393-closed.jpg) | [Top bar](en-393-closed.jpg) |
| 393 x 852 open | [Drawer](ar-393-open.jpg) | [Drawer](en-393-open.jpg) |
| Orders active, 1440 x 900 | [Orders](ar-1440-orders.jpg) | [Orders](en-1440-orders.jpg) |
| Nested trip active, 1440 x 900 | [Trip detail](ar-1440-nested-trip.jpg) | [Trip detail](en-1440-nested-trip.jpg) |

Additional route screenshots at every remaining size:

| Viewport | Orders AR / EN | Nested trip AR / EN |
| --- | --- | --- |
| 1024 x 768 | [AR](ar-1024-orders.jpg) / [EN](en-1024-orders.jpg) | [AR](ar-1024-nested-trip.jpg) / [EN](en-1024-nested-trip.jpg) |
| 768 x 1024 | [AR](ar-768-orders.jpg) / [EN](en-768-orders.jpg) | [AR](ar-768-nested-trip.jpg) / [EN](en-768-nested-trip.jpg) |
| 393 x 852 | [AR](ar-393-orders.jpg) / [EN](en-393-orders.jpg) | [AR](ar-393-nested-trip.jpg) / [EN](en-393-nested-trip.jpg) |

[Normal-motion drawer after animation](ar-393-motion-complete.jpg).

## Verification

- `npm run lint`, `npx tsc --noEmit` and `npm run build` passed.
- All eight size/language combinations passed: correct start side, 260px desktop sidebar, mobile drawer width, 48px nav targets, one active item, no horizontal overflow or overlap with page content.
- Active states checked on `/admin`, `/admin/orders`, and `/admin/trips/[tripId]`. Home matches exactly; nested trips highlight Trips. Active rows scroll into view inside the navigation area.
- Tab and Shift+Tab stay inside the dialog. Escape/backdrop/close button close it; focus returns to the hamburger. Route navigation and resizing to desktop close the drawer. Body scrolling is restored with no layout jump.
- Reduced motion disables transitions/stagger. Normal motion reaches the same visible final state. No client or hydration errors.
- Existing logout button tested in both languages on desktop and phone: signs out, clears the cart, redirects to login. Back-to-site links navigate to `/` and release scroll lock.
- Anonymous and non-admin fixtures are redirected to login by the unchanged server guard.
- No real admin credentials were used, so live Supabase session/permission testing remains a release smoke check.

## Scope and integration

- All existing ten navigation destinations are retained. `/admin/sessions` remains its existing alias for Classes & sessions, so it is not duplicated.
- Groups and bilingual labels live only in `src/app/(admin)/admin/admin-nav.ts`; chrome copy lives in `src/i18n/admin-sidebar.ts`. Existing admin page text is unchanged.
- The layout still calls `getAdminSession()` before rendering. The client fetches only the signed-in administrator's optional display name; it does not decide permissions.
- Final pre-PR fetch found no open PR or remote branch editing admin layout/navigation. The old local `feature/admin-route-fix` commit is patch-equivalent to code already on main (`git cherry` marks it `-`). Concurrent catalog-editor/upload work does not overlap the sidebar files.

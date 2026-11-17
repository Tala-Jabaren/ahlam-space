# Floating WhatsApp contact

Customer-facing public and member layouts now include one compact WhatsApp link. The URL is passed from the existing server-side `WHATSAPP_URL` in `src/content/site-contact.ts`; no duplicated contact number or client import of banking data.

- Sage #617A55 circle, ivory #F7F6F0 icon, soft-leaf hover, powder-blue focus outline. 54px touch target and accessible Arabic/English labels with a new-tab announcement.
- Logical inline-end placement and safe-area spacing. The button rises above the cart bar on phones and clears the member bottom navigation/sidebar. The native mobile menu hides it while open.
- One `data-cart-bottom-bar` marker was added to existing cart markup for CSS-only collision avoidance. No cart/auth/booking/payment behavior changed.
- Public/member customer pages only; admin and auth screens are unchanged. No SQL, settings, dependency or environment changes required.

## Verification

`npm run lint`, `npx tsc --noEmit` and production build passed. The existing Next security-upgrade reminder initially stopped the build; the immediate retry passed with the advisory still visible. A separate security upgrade remains recommended; dependencies are unchanged here.

Playwright/Edge tested 24 combinations: Arabic/English, 393/768/1440px, public/member shop, empty/nonempty cart. Verified one link, exact existing WhatsApp URL, new-tab/noopener behavior, branded colors, no page overflow and no cart/navigation/sidebar overlap. Also checked cart-page bar disappearance and native menu open/close. No client/hydration errors.

The WhatsApp navigation was intercepted locally and verified without contacting WhatsApp or sending messages. Data is synthetic. Real phone app handoff depends on WhatsApp being installed; desktop uses the standard wa.me experience.

## Phone screenshots

| Context | Arabic | English |
| --- | --- | --- |
| Public, empty cart | [View](ar-393-public-cart-0.jpg) | — |
| Public, cart visible | [View](ar-393-public-cart-2.jpg) | [View](en-393-public-cart-2.jpg) |
| Member, empty cart | [View](ar-393-member-cart-0.jpg) | — |
| Member, cart visible | [View](ar-393-member-cart-2.jpg) | [View](en-393-member-cart-2.jpg) |

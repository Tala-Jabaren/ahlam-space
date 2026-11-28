import { getSafeReturnTo } from '@/lib/safe-return-to'

// Single source of truth for "send a guest to log in, then bring her back
// here" - every gated page/link builds this the same way, so the query
// string (and the message explaining why she landed on /login) can't
// drift between call sites.
export function loginHref(returnTo: string) {
  const safeReturnTo = getSafeReturnTo(returnTo) ?? returnTo
  return `/login?returnTo=${encodeURIComponent(safeReturnTo)}&message=login-required`
}

// What a single class session costs on its own, for computing a package's
// per-session price and "savings vs paying one at a time" - not a lookup
// against any specific class's own price (those vary per class), just the
// baseline the packages feature is sold against. Update here if that
// baseline price ever changes; nothing in supabase/class-packages.sql
// depends on this value, it's purely a display calculation.
export const SINGLE_SESSION_PRICE = 60

export function perSessionPrice(price: number, sessionsCount: number) {
  return sessionsCount > 0 ? price / sessionsCount : 0
}

// Null when the package costs the same or more than paying per session -
// callers should only show a savings line when this isn't null.
export function packageSavings(price: number, sessionsCount: number): number | null {
  const savings = SINGLE_SESSION_PRICE * sessionsCount - price
  return savings > 0 ? savings : null
}

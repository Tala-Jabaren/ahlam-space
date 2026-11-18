// Server-side only - never exposed to the browser (no NEXT_PUBLIC_ prefix),
// since every call site that reads it is a Server Component, Route
// Handler, or server action. Default is off/unset: PACKAGES_ENABLED must be
// the exact string 'true' in the environment for the class-packages
// feature (class_packages, package_purchases, classes.package_eligible,
// purchase payment_method) to be queried or shown anywhere. While this is
// false, no code path may select, insert, or RPC against any of those -
// see supabase/class-packages.sql's header for why that boundary matters
// before the migration there has been run.
export const PACKAGES_ENABLED = process.env.PACKAGES_ENABLED === 'true'

import { redirect } from 'next/navigation'

// Packages live only on /classes now (its «باقات» tab) - this route is kept
// only so an old bookmark/link still lands somewhere sensible, regardless
// of auth state or PACKAGES_ENABLED (the target page already handles the
// flag being off on its own). Lives under (public), not (member), so a
// logged-out visitor reaches /classes directly instead of being bounced to
// login first.
export default function LegacyPackagesRedirect() {
  redirect('/classes?view=packages')
}

import { redirect } from 'next/navigation'

// Packages are member-only now (the «باقات» tab inside /member-schedule) -
// this route is kept only so an old bookmark/link still lands somewhere
// sensible. A logged-out visitor is bounced to login by the (member)
// layout itself, same as any other member-only page.
export default function LegacyPackagesRedirect() {
  redirect('/member-schedule?view=packages')
}

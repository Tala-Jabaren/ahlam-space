import 'server-only'
import type { createAdminClient } from '@/lib/supabase/admin'

// Email only ever lives in auth.users (profiles has no email column), so
// it can't be read via a normal profiles query - it needs the Admin API.
// This replaces what used to be one admin.auth.admin.getUserById() round
// trip PER DISTINCT CUSTOMER on the page (issued in parallel, but still
// that many separate Admin API calls every single page load) with one
// listUsers() call that covers them all - paginated only in the unlikely
// case this studio ever has more customers than fit on a single page.
export async function getEmailsByIds(
  admin: ReturnType<typeof createAdminClient>,
  userIds: string[],
): Promise<Map<string, string>> {
  const emails = new Map<string, string>()
  if (userIds.length === 0) return emails
  const remaining = new Set(userIds)
  const perPage = 1000
  for (let page = 1; remaining.size > 0; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error || !data?.users?.length) break
    for (const user of data.users) {
      if (remaining.has(user.id)) {
        if (user.email) emails.set(user.id, user.email)
        remaining.delete(user.id)
      }
    }
    if (data.users.length < perPage) break
  }
  return emails
}

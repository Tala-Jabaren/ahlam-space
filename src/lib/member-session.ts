import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Mirrors admin-session.ts's getAdminSession: one real auth.getUser() round
// trip to Supabase per request, shared by the member layout and every page
// under (member) that needs the user - instead of each of them (layout,
// then the page itself) independently re-verifying the same session,
// which was adding redundant network round trips to every member-area
// navigation on top of src/proxy.ts's own session check.
export const getMemberSession = cache(async () => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    if (error) console.error('supabase.auth.getUser() failed:', error.message)
    // The (member) layout already redirects here first in the normal case -
    // this only fires if a page somehow rendered without that layout, or
    // the session lapsed between the layout's check and this one.
    redirect('/login?message=session-expired')
  }
  return { supabase, user }
})

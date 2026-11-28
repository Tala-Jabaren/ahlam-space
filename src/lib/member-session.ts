import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Mirrors admin-session.ts's getAdminSession: one cached session read per
// request, shared by the member layout and every page under (member) that
// needs the user - instead of each of them (layout, then the page itself)
// independently re-verifying the same session, which was adding redundant
// round trips to every member-area navigation.
//
// getSession() reads the already-verified, already-refreshed session from
// cookies (local JWT check, no network round trip) instead of getUser()'s
// own server round trip - safe here because src/proxy.ts already ran the
// authoritative getUser()-and-refresh for this exact request before this
// ever runs, on every route its matcher covers (effectively everything).
export const getMemberSession = cache(async () => {
  const supabase = await createClient()
  const { data: { session }, error } = await supabase.auth.getSession()
  const user = session?.user
  if (error || !user) {
    if (error) console.error('supabase.auth.getSession() failed:', error.message)
    // The (member) layout already redirects here first in the normal case -
    // this only fires if a page somehow rendered without that layout, or
    // the session lapsed between the layout's check and this one.
    redirect('/login?message=session-expired')
  }
  return { supabase, user }
})

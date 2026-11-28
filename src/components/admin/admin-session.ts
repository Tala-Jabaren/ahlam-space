import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const getAdminSession = cache(async () => {
  const supabase = await createClient()
  // getSession() reads the already-verified, already-refreshed session from
  // cookies (local JWT check, no network round trip) instead of getUser()'s
  // own server round trip - safe here because src/proxy.ts already ran the
  // authoritative getUser()-and-refresh for this exact request before this
  // ever runs, on every route its matcher covers (effectively everything).
  const { data: { session }, error } = await supabase.auth.getSession()
  const user = session?.user
  if (error || !user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || profile?.role !== 'admin') redirect('/login')
  return supabase
})

export const hasPrimaryAdminAccess = cache(async () => {
  const supabase = await getAdminSession()
  const { data, error } = await supabase.rpc('is_primary_admin')
  return !error && data === true
})

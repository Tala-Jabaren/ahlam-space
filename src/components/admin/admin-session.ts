import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const getAdminSession = cache(async () => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
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

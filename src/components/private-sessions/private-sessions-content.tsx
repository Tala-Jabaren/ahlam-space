import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { defaultPrivateSessionServices, type PrivateSessionService } from '@/lib/private-session-services'
import PrivateSessionsClient from './private-sessions-client'

// Shared by the public /private-sessions route and the member
// /member/private-sessions one (bookingInDialog distinguishes them) -
// requires an account either way; on the member route the layout above
// already guarantees a user, so this never actually fires there.
export default async function PrivateSessionsContent({ bookingInDialog = false }: { bookingInDialog?: boolean }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?returnTo=${encodeURIComponent('/private-sessions')}&message=login-required`)
  const { data, error } = await supabase
    .from('private_session_services')
    .select('*')
    .order('id')
    .returns<PrivateSessionService[]>()

  return <PrivateSessionsClient catalog={error ? defaultPrivateSessionServices : data ?? []} bookingInDialog={bookingInDialog} />
}

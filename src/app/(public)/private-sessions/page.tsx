import { createClient } from '@/lib/supabase/server'
import { defaultPrivateSessionServices, type PrivateSessionService } from '@/lib/private-session-services'
import PrivateSessionsClient from './private-sessions-client'

export default async function PrivateSessionsPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('private_session_services')
    .select('*')
    .order('id')
    .returns<PrivateSessionService[]>()

  return <PrivateSessionsClient catalog={error ? defaultPrivateSessionServices : data ?? []} />
}

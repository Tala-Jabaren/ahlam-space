import { createClient } from '@/lib/supabase/server'
import CheckoutForm from './checkout-form'

export default async function CheckoutPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return <CheckoutForm isInitiallyLoggedIn={Boolean(user)} />
}

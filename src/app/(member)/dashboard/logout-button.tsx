'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#617A55]/30 px-7 py-3 text-sm font-semibold text-[#617A55] transition hover:bg-[#D6E2B6]/70"
      type="button"
      onClick={handleLogout}
    >
      Log out
    </button>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LogoutButton({
  variant = 'default',
}: {
  variant?: 'default' | 'sidebar'
}) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      className={
        variant === 'sidebar'
          ? 'flex min-h-12 w-full items-center gap-4 rounded-lg px-4 text-right font-medium text-[#617A55] transition hover:bg-[#C7D6E8]/60'
          : 'inline-flex min-h-11 items-center justify-center rounded-full border border-[#617A55]/30 px-7 py-3 text-sm font-semibold text-[#617A55] transition hover:bg-[#D6E2B6]/70'
      }
      type="button"
      onClick={handleLogout}
    >
      {variant === 'sidebar' && (
        <span aria-hidden="true" className="grid size-7 place-items-center">
          ←
        </span>
      )}
      {variant === 'sidebar' ? 'تسجيل الخروج' : 'Log out'}
    </button>
  )
}

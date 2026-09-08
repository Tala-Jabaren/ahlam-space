import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from './logout-button'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (!user) {
    if (error) {
      console.error('supabase.auth.getUser() failed:', error.message)
    }
    redirect('/login')
  }

  return (
    <main className="min-h-screen bg-[#F7F6F0] px-5 py-12 text-[#25311f] sm:px-8 lg:px-10">
      <section className="mx-auto max-w-5xl">
        <div className="rounded-[2rem] border border-[#617A55]/10 bg-white/70 p-6 shadow-sm sm:p-8">
          <div className="max-w-2xl space-y-4">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#617A55]">
              Member area
            </p>
            <h1 className="font-serif text-5xl leading-tight sm:text-6xl">
              Dashboard
            </h1>
            <p className="text-lg leading-8 text-[#4f5d49]">
              Logged in as:{' '}
              <span className="font-medium text-[#25311f]">{user.email}</span>
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#617A55] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#4f6645]"
              href="/bookings"
            >
              حجوزاتي
            </Link>
            <LogoutButton />
          </div>
        </div>
      </section>
    </main>
  )
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AccountProfile from './account-profile'

export default async function AccountPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (!user) {
    if (userError) {
      console.error('supabase.auth.getUser() failed:', userError.message)
    }
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, phone, city')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('Failed to load profile:', profileError.message)
  }

  return (
    <main className="px-4 py-8 text-[#617A55] sm:px-6 sm:py-10 lg:px-8" dir="rtl">
      <section className="mx-auto max-w-7xl">
        <header className="relative overflow-hidden border-b border-[#617A55]/15 pb-8 sm:pb-10">
          <div className="relative z-10 max-w-2xl">
            <h1 className="font-serif text-4xl leading-tight text-[#617A55] sm:text-5xl">
              حسابي
            </h1>
            <p className="mt-3 text-base leading-8 text-[#617A55]/75 sm:text-lg">
              إدارة معلوماتك الشخصية وتحديثها بسهولة.
            </p>
          </div>

          <div
            aria-hidden="true"
            className="absolute bottom-0 left-5 hidden h-28 w-40 opacity-20 sm:block"
          >
            <span className="absolute bottom-1 left-16 h-24 w-px -rotate-12 bg-[#617A55]" />
            <span className="absolute bottom-14 left-5 h-12 w-7 -rotate-45 rounded-[100%_0_100%_0] bg-[#617A55]" />
            <span className="absolute bottom-8 left-16 h-12 w-7 -rotate-12 rounded-[100%_0_100%_0] bg-[#617A55]" />
            <span className="absolute bottom-16 left-24 h-12 w-7 rotate-12 rounded-[0_100%_0_100%] bg-[#617A55]" />
          </div>
        </header>

        <AccountProfile
          initialProfile={{
            fullName: profile?.full_name ?? '',
            phone: profile?.phone ?? '',
            email: user.email ?? '',
            city: profile?.city ?? '',
          }}
        />
      </section>
    </main>
  )
}

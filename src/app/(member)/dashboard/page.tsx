import { redirect } from 'next/navigation'
import Link from 'next/link'
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
    <div style={{ maxWidth: 600, margin: '40px auto' }}>
      <h1>Dashboard</h1>
      <p>Logged in as: {user.email}</p>
      <p>
        <Link href="/bookings">حجوزاتي</Link>
      </p>
      <LogoutButton />
    </div>
  )
}

import { redirect } from 'next/navigation'

export default function AdminSessionsRedirect() {
  redirect('/admin/classes?tab=sessions')
}

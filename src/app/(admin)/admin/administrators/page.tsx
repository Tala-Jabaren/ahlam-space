import { redirect } from 'next/navigation'
import { getAdminSession, hasPrimaryAdminAccess } from '@/components/admin/admin-session'
import { adminAccessCopy } from '@/i18n/admin-access'
import { getLocale } from '@/i18n/get-locale'
import AdminAccessControls, { type Administrator } from './admin-access-controls'

export default async function AdministratorsPage() {
  if (!(await hasPrimaryAdminAccess())) redirect('/admin')

  const supabase = await getAdminSession()
  const locale = await getLocale()
  const copy = adminAccessCopy[locale]
  const { data, error } = await supabase.rpc('admin_list_administrators')
  const administrators = Array.isArray(data) ? data as Administrator[] : null

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 text-[#25311f] sm:px-6 lg:px-8">
      <header className="border-b border-[#617A55]/15 pb-6">
        <h1 className="font-serif text-3xl text-[#465d3d] sm:text-4xl">{copy.title}</h1>
      </header>
      {error || !administrators ? (
        <p role="alert" className="mt-6 rounded-xl bg-[#EAF1F8] p-4">{copy.loadError}</p>
      ) : (
        <AdminAccessControls administrators={administrators} locale={locale} />
      )}
    </main>
  )
}

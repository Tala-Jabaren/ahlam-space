import AdminSectionPage from '@/components/admin/sections/section-page'
import CoursesContent from '@/components/admin/sections/courses-content'
import DomainPayments from '@/components/admin/sections/domain-payments'

export default async function AdminCoursesPage({ searchParams }: {
  searchParams: Promise<{ tab?: string; filter?: string; item?: string }>
}) {
  const params = await searchParams
  const tab = params.tab === 'payments' ? 'payments' : 'content'
  return <AdminSectionPage section="courses" activeTab={tab} itemOpen={Boolean(params.item)}>
    {tab === 'payments' ? <DomainPayments kind="course" filter={params.filter} selectedId={params.item} /> : <CoursesContent />}
  </AdminSectionPage>
}

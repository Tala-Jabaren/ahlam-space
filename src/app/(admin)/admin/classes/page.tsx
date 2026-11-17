import AdminSectionPage from '@/components/admin/sections/section-page'
import ClassesContent from '@/components/admin/sections/classes-content'
import DomainPayments from '@/components/admin/sections/domain-payments'

export default async function AdminClassesPage({ searchParams }: {
  searchParams: Promise<{ tab?: string; classId?: string; new?: string; filter?: string; item?: string }>
}) {
  const params = await searchParams
  const tab = params.tab === 'payments' || params.tab === 'types' ? params.tab : 'sessions'
  return <AdminSectionPage section="classes" activeTab={tab} itemOpen={Boolean(params.item)}>
    {tab === 'payments'
      ? <DomainPayments kind="booking" filter={params.filter} selectedId={params.item} />
      : <ClassesContent searchParams={Promise.resolve(params)} />}
  </AdminSectionPage>
}

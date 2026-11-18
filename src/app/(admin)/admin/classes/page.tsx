import AdminSectionPage from '@/components/admin/sections/section-page'
import ClassesContent from '@/components/admin/sections/classes-content'
import DomainPayments from '@/components/admin/sections/domain-payments'
import PackagesContent from '@/components/admin/sections/packages-content'
import PackagePayments from '@/components/admin/sections/package-payments'
import { PACKAGES_ENABLED } from '@/lib/feature-flags'

export default async function AdminClassesPage({ searchParams }: {
  searchParams: Promise<{ tab?: string; classId?: string; new?: string; filter?: string; pfilter?: string; item?: string }>
}) {
  const params = await searchParams
  const tab =
    params.tab === 'payments' || params.tab === 'types'
      ? params.tab
      : params.tab === 'packages' && PACKAGES_ENABLED
        ? 'packages'
        : 'sessions'
  return <AdminSectionPage section="classes" activeTab={tab} itemOpen={Boolean(params.item)}>
    {tab === 'payments' ? (
      <div className="grid gap-8">
        <DomainPayments kind="booking" filter={params.filter} selectedId={params.item} />
        {PACKAGES_ENABLED && <PackagePayments filter={params.pfilter} selectedId={params.item} />}
      </div>
    ) : tab === 'packages' ? (
      <PackagesContent />
    ) : (
      <ClassesContent searchParams={Promise.resolve(params)} />
    )}
  </AdminSectionPage>
}

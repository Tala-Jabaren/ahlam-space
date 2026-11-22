import { notFound } from 'next/navigation'
import { getAdminSession } from '@/components/admin/admin-session'
import CustomerDetailView from '../_detail-view'
import { customerListUrl, type CustomerSearchParams } from '../_navigation'
import { getCustomerAccountState, getCustomerDetail } from '@/lib/admin-customers'
import CustomerAccountControls from '../_account-controls'

export default async function CustomerDetailPage({ params, searchParams }: {
  params: Promise<{ userId: string }>
  searchParams: Promise<CustomerSearchParams>
}) {
  const supabase = await getAdminSession()
  const { userId } = await params
  const filters = await searchParams
  const state = await getCustomerAccountState(supabase, userId)
  if (!state) notFound()
  const detail = await getCustomerDetail(supabase, userId)
  if (!detail) notFound()
  const backHref = customerListUrl(filters, 'users')
  return <CustomerDetailView detail={detail} backHref={backHref} accountControls={
    <CustomerAccountControls
      userId={userId}
      name={detail.profile.full_name || detail.profile.email || 'هذا الزبون'}
      disabled={state === 'disabled'}
      backHref={backHref}
    />
  } />
}

import { notFound } from 'next/navigation'
import { getAdminSession } from '@/components/admin/admin-session'
import CustomerDetailView from '../_detail-view'
import { customerListUrl, type CustomerSearchParams } from '../_navigation'
// Backend handoff: replace '../_mock' with '@/lib/admin-customers'.
import { getCustomerDetail } from '../_mock'

export default async function CustomerDetailPage({ params, searchParams }: {
  params: Promise<{ userId: string }>
  searchParams: Promise<CustomerSearchParams>
}) {
  const supabase = await getAdminSession()
  const { userId } = await params
  const filters = await searchParams
  const detail = await getCustomerDetail(supabase, userId)
  if (!detail) notFound()
  return <CustomerDetailView detail={detail} backHref={customerListUrl(filters, 'users')} />
}

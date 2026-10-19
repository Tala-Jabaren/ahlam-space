import { notFound } from 'next/navigation'
import { getAdminSession } from '@/components/admin/admin-session'
import CustomerDetailView from '../_detail-view'
import { customerListUrl, type CustomerSearchParams } from '../_navigation'
// Backend handoff: replace '../_mock' with '@/lib/admin-customers'.
import { getGuestDetail } from '../_mock'

export default async function GuestDetailPage({ searchParams }: {
  searchParams: Promise<CustomerSearchParams>
}) {
  const supabase = await getAdminSession()
  const params = await searchParams
  const phone = typeof params.phone === 'string' ? params.phone.trim() : ''
  if (!phone) notFound()
  const detail = await getGuestDetail(supabase, phone)
  if (!detail) notFound()
  return <CustomerDetailView detail={detail} backHref={customerListUrl(params, 'guests')} />
}

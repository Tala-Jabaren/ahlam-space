import { redirect } from 'next/navigation'

// Legacy entry point: payments now live inside each domain.
export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<{ filter?: string; item?: string }> }) {
  const { filter, item } = await searchParams
  const params = new URLSearchParams({ tab: 'payments' })
  if (filter === 'paid' || filter === 'all') params.set('filter', filter)
  if (item) params.set('item', item)
  redirect(`/admin/classes?${params}`)
}

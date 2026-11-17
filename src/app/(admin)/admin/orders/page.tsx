import { redirect } from 'next/navigation'

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ item?: string }> }) {
  const { item } = await searchParams
  const params = new URLSearchParams({ tab: 'orders' })
  if (item) params.set('item', item)
  redirect(`/admin/products?${params}`)
}

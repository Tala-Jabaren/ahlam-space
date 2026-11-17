import AdminSectionPage from '@/components/admin/sections/section-page'
import ProductsContent from '@/components/admin/sections/products-content'
import OrdersContent from '@/components/admin/sections/orders-content'
import DomainPayments from '@/components/admin/sections/domain-payments'

export default async function AdminProductsPage({ searchParams }: {
  searchParams: Promise<{ tab?: string; filter?: string; item?: string }>
}) {
  const params = await searchParams
  const tab = params.tab === 'orders' || params.tab === 'payments' ? params.tab : 'products'
  return <AdminSectionPage section="shop" activeTab={tab} itemOpen={Boolean(params.item)}>
    {tab === 'orders' ? <OrdersContent selectedId={params.item} /> : tab === 'payments'
      ? <DomainPayments kind="order" filter={params.filter} selectedId={params.item} /> : <ProductsContent />}
  </AdminSectionPage>
}

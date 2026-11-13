import ProductDetail from '@/components/commerce/product-detail'
import { memberRoutes } from '@/lib/experience-routes'

export default function MemberProductPage(props: { params: Promise<{ id: string }> }) {
  return <ProductDetail {...props} routes={memberRoutes} />
}

import { redirect } from 'next/navigation'
import { memberRoutes } from '@/lib/experience-routes'

export default function LegacyOrdersPage() {
  redirect(memberRoutes.orders)
}

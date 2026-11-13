import CourseCatalog from '@/components/commerce/course-catalog'
import { memberRoutes } from '@/lib/experience-routes'

export default function MemberCoursesPage(props: { searchParams: Promise<{ error?: string }> }) {
  return <CourseCatalog {...props} routes={memberRoutes} />
}

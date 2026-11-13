import CourseDetail from '@/components/commerce/course-detail'
import { memberRoutes } from '@/lib/experience-routes'

export const dynamic = 'force-dynamic'

export default function MemberCoursePage(props: { params: Promise<{ id: string }> }) {
  return <CourseDetail {...props} routes={memberRoutes} />
}

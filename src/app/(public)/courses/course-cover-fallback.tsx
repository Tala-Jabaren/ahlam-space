import { BookOpen, Headphones, Video } from 'lucide-react'

const icons = { audio: Headphones, video: Video, article: BookOpen }

// A designed placeholder for a course with no cover image yet, instead of
// an empty box - soft organic shapes in the site's own sage/cream palette
// plus a centered icon for the content type.
export default function CourseCoverFallback({ contentType }: { contentType: 'audio' | 'video' | 'article' }) {
  const Icon = icons[contentType]
  return (
    <div
      aria-hidden="true"
      className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#D6E2B6]/60 via-[#F7F6F0] to-[#C7D6E8]/40"
    >
      <span className="absolute -start-6 -top-10 h-40 w-40 rounded-full bg-[#617A55]/10" />
      <span className="absolute -end-8 bottom-[-3rem] h-48 w-48 rounded-full bg-[#617A55]/10" />
      <span className="relative grid size-16 place-items-center rounded-full bg-[#F7F6F0]/80 text-[#617A55] shadow-sm ring-1 ring-[#617A55]/10">
        <Icon strokeWidth={1.5} className="size-7" />
      </span>
    </div>
  )
}

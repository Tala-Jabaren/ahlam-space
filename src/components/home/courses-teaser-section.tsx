import Image from 'next/image'
import Link from 'next/link'
import WordRevealText from './word-reveal-text'

export type CourseTeaserItem = {
  id: string
  title: string
  description: string
  cover_image_url: string | null
}

type CoursesTeaserCopy = {
  heading: string
  subheading: string
  detailsLabel: string
}

// Hidden entirely when there are no active courses to show - same "no
// placeholder, no empty state" rule the trips/reviews sections follow.
export default function CoursesTeaserSection({
  copy,
  courses,
}: {
  copy: CoursesTeaserCopy
  courses: CourseTeaserItem[]
}) {
  if (courses.length === 0) return null

  const headingWords = copy.heading.split(' ')
  const accent = headingWords[headingWords.length - 1]

  return (
    <section className="scroll-reveal border-t border-[#55684A]/10 bg-[#F6F5EE] px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-7xl text-center">
        <WordRevealText
          as="h2"
          text={copy.heading}
          dimBackground="#F6F5EE"
          accentWord={accent}
          className="block font-serif text-4xl text-[#34472B] sm:text-5xl"
        />
        <p className="mt-3 text-base text-[#34472B]/75">{copy.subheading}</p>

        <div className="mt-10 grid gap-6 text-start sm:grid-cols-3">
          {courses.map((course, index) => (
            <article
              key={course.id}
              className="scroll-reveal flex flex-col overflow-hidden rounded-2xl border border-[#55684A]/15 bg-white transition hover:-translate-y-1"
              style={{ animationDelay: `${index * 90}ms` } as React.CSSProperties}
            >
              <div className="relative h-44 w-full bg-[#E4ECD6]">
                {course.cover_image_url && (
                  <Image
                    src={course.cover_image_url}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 33vw, 100vw"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="font-serif text-xl text-[#34472B]">{course.title}</h3>
                <p className="mt-2 line-clamp-2 flex-1 text-sm leading-6 text-[#34472B]/75">{course.description}</p>
                <Link
                  href={`/courses/${course.id}`}
                  className="mt-5 inline-flex min-h-11 w-fit items-center justify-center rounded-full bg-[#34472B] px-5 text-sm font-semibold text-white transition hover:bg-[#55684A]"
                >
                  {copy.detailsLabel}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

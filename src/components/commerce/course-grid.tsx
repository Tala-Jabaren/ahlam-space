'use client'

import { useMemo, useState } from 'react'
import type { Dictionary } from '@/i18n/dictionaries'
import type { Locale } from '@/i18n/config'
import CourseCard, { type CourseCardData } from '@/app/(public)/courses/course-card'

function chipStyle(active: boolean) {
  return `inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-4 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55] ${active ? 'bg-[#617A55] text-[#F7F6F0]' : 'border border-[#617A55]/25 text-[#617A55] hover:bg-[#D6E2B6]/50'}`
}

type Purchase = { status: 'pending' | 'paid'; reference: string | null }

// One flat grid of every course, filterable by content type (محاضرات /
// تأملات) instead of two always-visible stacked sections - each section
// used to render even when the other was empty, so a studio with only
// meditations (or only lectures) still showed an empty-looking page split
// in two; a single filtered list reads better either way.
export default function CourseGrid({
  courses,
  purchases,
  isLoggedIn,
  t,
  locale,
  coursesHref,
  allLabel,
  meditationsLabel,
  lecturesLabel,
  filterLabel,
}: {
  courses: CourseCardData[]
  purchases: Record<string, Purchase>
  isLoggedIn: boolean
  t: Dictionary
  locale: Locale
  coursesHref: string
  allLabel: string
  meditationsLabel: string
  lecturesLabel: string
  filterLabel: string
}) {
  const [filter, setFilter] = useState<'all' | 'audio' | 'other'>('all')
  const hasMeditations = useMemo(() => courses.some(course => course.content_type === 'audio'), [courses])
  const hasLectures = useMemo(() => courses.some(course => course.content_type !== 'audio'), [courses])
  const filtered =
    filter === 'all' ? courses
      : filter === 'audio' ? courses.filter(course => course.content_type === 'audio')
        : courses.filter(course => course.content_type !== 'audio')

  return (
    <div>
      {hasMeditations && hasLectures && (
        <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label={filterLabel}>
          <button type="button" onClick={() => setFilter('all')} className={chipStyle(filter === 'all')}>
            {allLabel}
          </button>
          <button type="button" onClick={() => setFilter('audio')} className={chipStyle(filter === 'audio')}>
            {meditationsLabel}
          </button>
          <button type="button" onClick={() => setFilter('other')} className={chipStyle(filter === 'other')}>
            {lecturesLabel}
          </button>
        </div>
      )}
      <div className="grid gap-6">
        {filtered.map(course => (
          <CourseCard
            key={course.id}
            course={course}
            isLoggedIn={isLoggedIn}
            purchase={purchases[course.id]}
            t={t}
            locale={locale}
            coursesHref={coursesHref}
          />
        ))}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import type { Dictionary } from '@/i18n/dictionaries'
import type { Locale } from '@/i18n/config'
import CourseCard, { type CourseCardData } from '@/app/(public)/courses/course-card'

function tabStyle(active: boolean) {
  return `inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55] ${active ? 'bg-[#617A55] text-[#F7F6F0]' : 'text-[#617A55] hover:bg-white/60'}`
}

type Purchase = { status: 'pending' | 'paid'; reference: string | null }
type Tab = 'audio' | 'other'

// Two always-visible tabs (تأملات / محاضرات) instead of the two stacked
// sections this page used to render back to back - same pill-tab look as
// the admin classes page's "المواعيد / أنواع الحصص" switcher. A tab with
// no courses yet still shows (as "coming soon") rather than disappearing,
// since the point is to tell visitors a lectures section is on its way.
export default function CourseGrid({
  courses,
  purchases,
  isLoggedIn,
  t,
  locale,
  coursesHref,
  meditationsLabel,
  lecturesLabel,
  filterLabel,
  comingSoonLabel,
}: {
  courses: CourseCardData[]
  purchases: Record<string, Purchase>
  isLoggedIn: boolean
  t: Dictionary
  locale: Locale
  coursesHref: string
  meditationsLabel: string
  lecturesLabel: string
  filterLabel: string
  comingSoonLabel: string
}) {
  const hasMeditations = courses.some(course => course.content_type === 'audio')
  const [tab, setTab] = useState<Tab>(hasMeditations ? 'audio' : 'other')
  const filtered = courses.filter(course => (tab === 'audio' ? course.content_type === 'audio' : course.content_type !== 'audio'))

  return (
    <div>
      <nav className="mb-8 inline-flex rounded-full bg-[#D6E2B6]/40 p-1" aria-label={filterLabel}>
        <button type="button" aria-pressed={tab === 'audio'} onClick={() => setTab('audio')} className={tabStyle(tab === 'audio')}>
          {meditationsLabel}
        </button>
        <button type="button" aria-pressed={tab === 'other'} onClick={() => setTab('other')} className={tabStyle(tab === 'other')}>
          {lecturesLabel}
        </button>
      </nav>
      {filtered.length === 0 ? (
        <p className="rounded-lg bg-[#C7D6E8]/35 p-6 text-center text-sm leading-7 text-[#4f5d49]">{comingSoonLabel}</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
      )}
    </div>
  )
}

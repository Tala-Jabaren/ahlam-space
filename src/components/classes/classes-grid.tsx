'use client'

import { useMemo, useState } from 'react'
import ClassWeekSections, { type ClassWeekLabels } from './class-week-sections'
import type { ClassWeek } from '@/lib/class-schedule-weeks'
import type { ClassCardData } from './types'

function chipStyle(active: boolean) {
  return `inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-4 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55] ${active ? 'bg-[#617A55] text-[#F7F6F0]' : 'border border-[#617A55]/25 text-[#617A55] hover:bg-[#D6E2B6]/50'}`
}

export default function ClassesGrid({
  weeks,
  allLabel,
  filterLabel,
  weekLabels,
}: {
  weeks: ClassWeek<ClassCardData>[]
  allLabel: string
  filterLabel: string
  weekLabels: ClassWeekLabels
}) {
  const [filter, setFilter] = useState('all')
  const names = useMemo(
    () => [...new Set(weeks.flatMap(week => week.sessions.map(session => session.name)).filter((name): name is string => Boolean(name)))],
    [weeks]
  )
  const filtered = filter === 'all' ? weeks : weeks.map(week => ({
    ...week,
    sessions: week.sessions.filter(session => session.name === filter),
  }))

  return (
    <div>
      {names.length > 1 && (
        <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label={filterLabel}>
          <button type="button" onClick={() => setFilter('all')} className={chipStyle(filter === 'all')}>
            {allLabel}
          </button>
          {names.map(name => (
            <button key={name} type="button" onClick={() => setFilter(name)} className={chipStyle(filter === name)}>
              {name}
            </button>
          ))}
        </div>
      )}
      <ClassWeekSections weeks={filtered} labels={weekLabels} />
    </div>
  )
}

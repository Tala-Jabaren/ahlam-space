'use client'

import { useMemo, useState } from 'react'
import ClassCard from './class-card'
import type { ClassCardData } from './types'
import styles from './class-card.module.css'

function chipStyle(active: boolean) {
  return `inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-4 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55] ${active ? 'bg-[#617A55] text-[#F7F6F0]' : 'border border-[#617A55]/25 text-[#617A55] hover:bg-[#D6E2B6]/50'}`
}

// One flat, chronological grid of every upcoming session (3 per row on
// desktop, same styles.grid the admin/member schedules already use) - not
// grouped under a heading per class, since each class now has its own
// free-form name rather than a shared category to group by. A class-name
// filter replaces that grouping for narrowing the list down.
export default function ClassesGrid({
  sessions,
  allLabel,
  emptyLabel,
  filterLabel,
}: {
  sessions: ClassCardData[]
  allLabel: string
  emptyLabel: string
  filterLabel: string
}) {
  const [filter, setFilter] = useState('all')
  const names = useMemo(
    () => [...new Set(sessions.map(session => session.name).filter((name): name is string => Boolean(name)))],
    [sessions]
  )
  const filtered = filter === 'all' ? sessions : sessions.filter(session => session.name === filter)

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
      {filtered.length === 0 ? (
        <p className="rounded-lg bg-[#C7D6E8]/35 p-4 text-sm text-[#4f5d49]">{emptyLabel}</p>
      ) : (
        <div className={styles.grid}>
          {filtered.map(session => <ClassCard key={session.id} session={session} />)}
        </div>
      )}
    </div>
  )
}

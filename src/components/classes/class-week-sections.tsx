import type { ClassWeek } from '@/lib/class-schedule-weeks'
import ClassCard from './class-card'
import type { ClassCardData } from './types'
import styles from './class-card.module.css'

export type ClassWeekLabels = Record<ClassWeek<ClassCardData>['kind'], string> & { empty: string }

export default function ClassWeekSections({ weeks, labels }: { weeks: ClassWeek<ClassCardData>[]; labels: ClassWeekLabels }) {
  return (
    <div className="space-y-8">
      {weeks.filter(week => week.kind !== 'later' || week.sessions.length > 0).map(({ kind, sessions }) => (
        <section key={kind} aria-labelledby={`class-week-${kind}`}>
          <h2 id={`class-week-${kind}`} className="mb-4 border-b border-[#617A55]/20 pb-2 text-base font-semibold text-[#465d3d]">
            {labels[kind]}
          </h2>
          {sessions.length > 0 ? (
            <div className={styles.grid}>
              {sessions.map(session => <ClassCard key={session.id} session={session} headingLevel={3} />)}
            </div>
          ) : (
            <p className="text-sm text-[#4f5d49]">{labels.empty}</p>
          )}
        </section>
      ))}
    </div>
  )
}

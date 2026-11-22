'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { classCalendarHref } from '@/lib/admin-class-calendar'
import AddSessionForm, { type SessionClass } from './add-session-form'
import CreateClassForm from './create-class-form'

export default function CalendarAddClass({ date, today, classes, classId, packagesEnabled }: {
  date: string
  today: string
  classes: SessionClass[]
  classId: string
  packagesEnabled: boolean
}) {
  const [mode, setMode] = useState<'new' | 'existing' | null>(null)
  const returnHref = classCalendarHref(date)
  const matchingClass = classes.find((item) => item.id === classId)
  const formProps = { today, fixedDate: date, returnHref, initiallyOpen: true, onCancel: () => setMode(null) }

  if (!mode) {
    return (
      <button
        type="button"
        onClick={() => setMode(matchingClass ? 'existing' : 'new')}
        className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#617A55] px-4 text-sm font-semibold text-white hover:bg-[#4f6645] focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <Plus size={17} aria-hidden="true" />
        إضافة حصة
      </button>
    )
  }

  return (
    <section aria-label="إضافة حصة في اليوم المحدّد" className="mb-4 min-w-0 rounded-xl border border-[#617A55]/20 bg-white p-4">
      {classes.length > 0 && (
        <div role="group" aria-label="نوع الإضافة" className="flex flex-wrap gap-2">
          {([
            ['new', 'حصة جديدة'],
            ['existing', 'موعد لحصة موجودة'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={`min-h-11 rounded-full px-4 text-sm font-semibold text-[#465d3d] focus-visible:outline-2 ${mode === value ? 'bg-[#D6E2B6]' : 'bg-[#F7F6F0] hover:bg-[#D6E2B6]/45'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {mode === 'new' ? (
        <CreateClassForm {...formProps} packagesEnabled={packagesEnabled} />
      ) : (
        <AddSessionForm {...formProps} classes={classes} initialClassId={matchingClass?.id} />
      )}
    </section>
  )
}

'use client'

import { useId, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { useT } from '@/i18n/i18n-context'
import { formatPreferredSlot, MAX_PREFERRED_SLOTS, studioMinute } from '@/lib/private-session-preferences'

const navButtonClass = 'grid size-10 place-items-center rounded-full border border-[#617A55]/20 text-[#465d3d] hover:bg-[#D6E2B6]/60 focus-visible:outline-2 disabled:cursor-default disabled:opacity-35'

function monthAfter(month: string, offset: number) {
  const date = new Date(`${month}-01T00:00:00Z`)
  date.setUTCMonth(date.getUTCMonth() + offset)
  return date.toISOString().slice(0, 7)
}

export default function PreferredTimes({
  slots,
  onChange,
  disabled,
}: {
  slots: string[]
  onChange: (slots: string[]) => void
  disabled: boolean
}) {
  const { t, locale } = useT()
  const copy = t.privateSessions.availability
  const today = studioMinute().slice(0, 10)
  const [displayedMonth, setDisplayedMonth] = useState(today.slice(0, 7))
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [error, setError] = useState<string | null>(null)
  const timeId = useId()

  const firstDay = new Date(`${displayedMonth}-01T00:00:00Z`)
  const lastDay = new Date(`${monthAfter(displayedMonth, 1)}-01T00:00:00Z`)
  lastDay.setUTCDate(0)
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(firstDay)
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' })
  const weekdayFormat = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' })
  const dayNumber = new Intl.NumberFormat(locale)
  const full = slots.length >= MAX_PREFERRED_SLOTS

  function addTime() {
    if (!date || !time || full) return
    const slot = `${date}T${time}`
    if (slot <= studioMinute()) {
      setError(copy.past)
      return
    }
    if (slots.includes(slot)) {
      setError(copy.duplicate)
      return
    }
    onChange([...slots, slot].sort())
    setTime('')
    setError(null)
  }

  return (
    <fieldset disabled={disabled} className="mt-6 min-w-0 rounded-2xl border border-[#617A55]/20 bg-[#F7F6F0] px-3 pb-4 sm:px-5">
      <legend className="inline-flex items-center gap-2 px-2 text-sm font-semibold text-[#25311f]">
        <CalendarDays aria-hidden="true" size={17} />
        {copy.heading}
      </legend>
      <p className="my-3 text-sm leading-6 text-[#465d3d]">{copy.instructions}</p>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,0.65fr)]">
        <div className="rounded-xl border border-[#617A55]/15 bg-white p-2 sm:p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              className={navButtonClass}
              aria-label={copy.previousMonth}
              disabled={displayedMonth <= today.slice(0, 7)}
              onClick={() => setDisplayedMonth(monthAfter(displayedMonth, -1))}
            >
              <ChevronLeft aria-hidden="true" size={17} className="rtl:rotate-180" />
            </button>
            <p aria-live="polite" className="text-center text-sm font-semibold">{monthLabel}</p>
            <button
              type="button"
              className={navButtonClass}
              aria-label={copy.nextMonth}
              onClick={() => setDisplayedMonth(monthAfter(displayedMonth, 1))}
            >
              <ChevronRight aria-hidden="true" size={17} className="rtl:rotate-180" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {Array.from({ length: 7 }, (_, index) => (
              <span key={index} className="truncate py-1 text-[10px] font-semibold text-[#465d3d] sm:text-xs">
                {weekdayFormat.format(new Date(Date.UTC(2025, 0, 5 + index)))}
              </span>
            ))}
            {Array.from({ length: firstDay.getUTCDay() }, (_, index) => <span key={`empty-${index}`} aria-hidden="true" />)}
            {Array.from({ length: lastDay.getUTCDate() }, (_, index) => {
              const day = index + 1
              const key = `${displayedMonth}-${String(day).padStart(2, '0')}`
              const selected = date === key
              const hasProposal = slots.some((slot) => slot.startsWith(key))
              return (
                <button
                  key={key}
                  type="button"
                  disabled={key < today}
                  aria-label={dateFormat.format(new Date(`${key}T00:00:00Z`))}
                  aria-pressed={selected}
                  className={`min-h-10 min-w-0 rounded-lg text-sm outline-offset-2 focus-visible:outline-2 disabled:cursor-default disabled:opacity-40 ${
                    selected ? 'bg-[#465d3d] font-semibold text-white'
                    : hasProposal ? 'bg-[#D6E2B6] font-semibold text-[#25311f]'
                    : 'enabled:hover:bg-[#D6E2B6]/50'
                  }`}
                  onClick={() => { setDate(key); setError(null) }}
                >
                  {dayNumber.format(day)}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid content-start gap-2">
          <label htmlFor={timeId} className="text-sm font-semibold">{copy.pickTime}</label>
          {date && <p className="text-sm text-[#465d3d]">{dateFormat.format(new Date(`${date}T00:00:00Z`))}</p>}
          <input
            id={timeId}
            type="time"
            value={time}
            onChange={(event) => { setTime(event.target.value); setError(null) }}
            disabled={!date || full}
            className="min-h-11 min-w-0 w-full rounded-xl border border-[#617A55]/20 bg-white px-3 text-[#25311f] disabled:opacity-55"
          />
          <p className="text-xs text-[#465d3d]">{copy.timezone}</p>
          <button
            type="button"
            disabled={!date || !time || full}
            onClick={addTime}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-[#D6E2B6] px-3 text-sm font-semibold text-[#25311f] hover:bg-[#c6d5a4] focus-visible:outline-2 disabled:opacity-55"
          >
            <Plus aria-hidden="true" size={16} />
            {copy.add}
          </button>
          {full && <p className="text-sm text-[#465d3d]">{copy.limit}</p>}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        </div>
      </div>
      {slots.length > 0 && (
        <div className="mt-4 border-t border-[#617A55]/15 pt-3">
          <p className="mb-2 text-sm font-semibold">{copy.selected}</p>
          <ul className="flex flex-wrap gap-2">
            {slots.map((slot) => {
              const label = formatPreferredSlot(slot, locale)
              return (
                <li key={slot} className="inline-flex min-w-0 items-center gap-1 rounded-xl bg-[#EAF1F8] ps-3 text-sm text-[#25311f]">
                  <time dateTime={slot}>{label}</time>
                  <button
                    type="button"
                    aria-label={`${copy.remove} ${label}`}
                    onClick={() => onChange(slots.filter((item) => item !== slot))}
                    className="grid size-11 shrink-0 place-items-center rounded-xl hover:bg-[#C7D6E8] focus-visible:outline-2"
                  >
                    <X aria-hidden="true" size={16} />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </fieldset>
  )
}

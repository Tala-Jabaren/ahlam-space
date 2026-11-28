'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

const arrowStyle = 'grid size-11 shrink-0 place-items-center rounded-full bg-[#25311f]/85 text-white transition hover:bg-[#25311f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'

export default function TripImageCarousel({ images, title, locale = 'ar', className }: {
  images: string[]
  title: string
  locale?: string
  className: string
}) {
  const [position, setPosition] = useState(0)
  if (!images.length) return null

  const index = Math.min(position, images.length - 1)
  const arabic = locale === 'ar'
  const number = new Intl.NumberFormat(locale)
  const count = `${number.format(index + 1)} / ${number.format(images.length)}`

  function move(step: number) {
    setPosition((index + step + images.length) % images.length)
  }

  return (
    <div role="region" aria-label={arabic ? 'صور المشوار' : 'Trip photos'} className={`relative overflow-hidden bg-[#E4ECD6] ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={images[index]} alt={images.length > 1 ? `${title} (${count})` : title} loading="lazy" className="absolute inset-0 size-full object-cover" />
      {images.length > 1 && (
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
          <button type="button" onClick={() => move(-1)} aria-label={arabic ? 'الصورة السابقة' : 'Previous photo'} className={arrowStyle}>
            <ChevronLeft aria-hidden="true" size={21} className="rtl:rotate-180" />
          </button>
          <span aria-live="polite" dir="ltr" className="rounded-full bg-[#25311f]/85 px-3 py-1 text-sm text-white">{count}</span>
          <button type="button" onClick={() => move(1)} aria-label={arabic ? 'الصورة التالية' : 'Next photo'} className={arrowStyle}>
            <ChevronRight aria-hidden="true" size={21} className="rtl:rotate-180" />
          </button>
        </div>
      )}
    </div>
  )
}

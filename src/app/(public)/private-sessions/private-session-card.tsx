'use client'

import Image from 'next/image'
import { ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useT } from '@/i18n/i18n-context'
import { privateSessionDetailsAr } from '@/i18n/private-session-details'

type Props = {
  title: string
  price: number | null
  hourly: boolean
  duration: string | null
  image: string
  description: string
  requestLabel: string
  onRequest: () => void
}

export default function PrivateSessionCard({
  title,
  price,
  hourly,
  duration,
  image,
  description,
  requestLabel,
  onRequest,
}: Props) {
  const { t, locale } = useT()
  const copy = t.privateSessionDetails ?? privateSessionDetailsAr
  const [expanded, setExpanded] = useState(false)
  const detailsId = useId()
  const detailsRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!expanded) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // Reveal the panel after expansion when the card is near the viewport edge.
    const timer = window.setTimeout(() => {
      detailsRef.current?.scrollIntoView({
        block: 'nearest',
        behavior: reducedMotion ? 'instant' : 'smooth',
      })
    }, reducedMotion ? 0 : 250)
    return () => window.clearTimeout(timer)
  }, [expanded])
  const formattedPrice = price === null ? null : (hourly ? copy.price : copy.soundPrice).replace(
    '{price}',
    new Intl.NumberFormat(locale === 'ar' ? 'ar' : 'en-US').format(price),
  )
  const focusStyle =
    'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#617A55]'

  return (
    <section className="w-full max-w-[620px] self-start overflow-hidden rounded-[18px] border border-[#617A55]/[0.12] bg-white text-start transition-transform duration-200 motion-safe:hover:-translate-y-[3px] motion-reduce:transition-none">
      <div className="flex flex-col sm:min-h-[190px] sm:flex-row">
        <div className="relative h-[210px] w-full shrink-0 sm:h-auto sm:w-[190px]">
          <Image
            src={image}
            alt=""
            fill
            sizes="(min-width: 640px) 190px, 100vw"
            className="object-cover object-center"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col p-5">
          <h2 className="break-words font-serif text-2xl font-medium leading-tight text-[#25311f]">
            {title}
          </h2>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#4f5d49]">
            {description}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-auto">
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={detailsId}
              onClick={() => setExpanded((value) => !value)}
              className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-[#617A55]/35 bg-[#D6E2B6]/30 px-4 py-2 text-sm font-medium text-[#617A55] transition-colors hover:bg-[#D6E2B6]/60 ${focusStyle}`}
            >
              {expanded ? copy.less : copy.more}
              <ChevronDown
                aria-hidden="true"
                size={16}
                className={`shrink-0 transition-transform duration-250 motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
        </div>
      </div>
      <div
        ref={detailsRef}
        id={detailsId}
        aria-hidden={!expanded}
        inert={!expanded}
        className={`grid transition-[grid-template-rows] duration-250 ease-in-out motion-reduce:transition-none ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-[#617A55]/12 bg-[#F7F6F0] p-5">
            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[#4f5d49]">
              {description}
            </p>
            {(formattedPrice !== null || duration) && <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              {formattedPrice !== null && <div>
                <dt className="text-[#617A55]">{copy.priceLabel}</dt>
                <dd className="mt-1 font-medium text-[#25311f]">{formattedPrice}</dd>
              </div>}
              {duration && <div>
                <dt className="text-[#617A55]">{copy.durationLabel}</dt>
                <dd className="mt-1 font-medium text-[#25311f]">
                  {duration}
                </dd>
              </div>}
            </dl>}
            <button
              type="button"
              onClick={onRequest}
              className={`mt-5 min-h-11 max-w-full cursor-pointer rounded-full bg-[#617A55] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#617A55]/90 ${focusStyle}`}
            >
              {requestLabel}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

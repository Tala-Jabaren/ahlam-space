'use client'

import Image from 'next/image'
import { ChevronDown } from 'lucide-react'
import { useId, useState } from 'react'
import { useT } from '@/i18n/i18n-context'
import { privateSessionDetailsAr } from '@/i18n/private-session-details'
import { PRIVATE_SESSION_HOURLY_PRICE } from '@/lib/private-session-details'

type Props = {
  image: string
  description: string
  requestLabel: string
  onRequest: () => void
}

export default function PrivateSessionCard({
  image,
  description,
  requestLabel,
  onRequest,
}: Props) {
  const { t, locale } = useT()
  const copy = t.privateSessionDetails ?? privateSessionDetailsAr
  const [expanded, setExpanded] = useState(false)
  const detailsId = useId()
  const price = copy.price.replace(
    '{price}',
    new Intl.NumberFormat(locale === 'ar' ? 'ar' : 'en-US').format(
      PRIVATE_SESSION_HOURLY_PRICE,
    ),
  )
  const focusStyle =
    'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#617A55]'

  return (
    <section className="w-full max-w-[620px] self-start overflow-hidden rounded-[18px] border border-[#617A55]/[0.12] bg-white text-start transition-transform duration-200 motion-safe:hover:-translate-y-[3px] motion-reduce:transition-none">
      <div className="flex flex-col sm:h-[190px] sm:flex-row">
        <div className="relative h-[210px] w-full shrink-0 sm:h-full sm:w-[190px]">
          <Image
            src={image}
            alt=""
            fill
            sizes="(min-width: 640px) 190px, 100vw"
            className="object-cover object-center"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col p-5">
          <h2 className="font-serif text-2xl font-medium leading-tight text-[#25311f]">
            {copy.title}
          </h2>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#4f5d49]">
            {description}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-auto">
            <button
              type="button"
              onClick={onRequest}
              className={`rounded-full bg-[#D6E2B6] px-5 py-2.5 text-sm font-medium text-[#617A55] transition-colors hover:bg-[#D6E2B6]/70 ${focusStyle}`}
            >
              {requestLabel}
            </button>
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={detailsId}
              onClick={() => setExpanded((value) => !value)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-[#617A55] transition-colors hover:bg-[#D6E2B6]/35 ${focusStyle}`}
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
        id={detailsId}
        aria-hidden={!expanded}
        inert={!expanded}
        className={`grid transition-[grid-template-rows] duration-250 ease-in-out motion-reduce:transition-none ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-[#617A55]/12 bg-[#F7F6F0] p-5">
            <p className="text-sm leading-6 text-[#4f5d49]">
              {copy.description}
            </p>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[#617A55]">{copy.priceLabel}</dt>
                <dd className="mt-1 font-medium text-[#25311f]">{price}</dd>
              </div>
              <div>
                <dt className="text-[#617A55]">{copy.durationLabel}</dt>
                <dd className="mt-1 font-medium text-[#25311f]">
                  {copy.duration}
                </dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={onRequest}
              className={`mt-5 min-h-11 max-w-full rounded-full bg-[#617A55] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#617A55]/90 ${focusStyle}`}
            >
              {copy.contact}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

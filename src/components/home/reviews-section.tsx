'use client'

import { useRef, useState } from 'react'
import { useT } from '@/i18n/i18n-context'
import type { Review } from '@/content/reviews'

// Long reviews (6 and 7 in practice - ~3700 and ~1500 characters) get an
// excerpt + expand control instead of filling the whole card; the short
// ones (1-5, all under 650 characters) show in full. Picked by length, not
// by id, so this keeps working correctly if reviews are added/removed.
const LONG_TEXT_THRESHOLD = 900

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55]'

function QuoteMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 32"
      className="absolute -top-2 start-4 size-10 text-[#617A55]/10 sm:size-12"
      fill="currentColor"
    >
      <path d="M9.6 8C5.4 10.9 3 14.6 3 19.1c0 4.1 2.6 6.9 6 6.9 3 0 5.2-2.3 5.2-5.3 0-2.8-1.9-4.9-4.4-5.2-.3 0-.5-.2-.4-.5.6-2.5 2.6-5 5.4-6.6.3-.2.2-.7-.1-.8L9.9 7.9c-.1-.1-.2-.1-.3.1Zm16 0c-4.2 2.9-6.6 6.6-6.6 11.1 0 4.1 2.6 6.9 6 6.9 3 0 5.2-2.3 5.2-5.3 0-2.8-1.9-4.9-4.4-5.2-.3 0-.5-.2-.4-.5.6-2.5 2.6-5 5.4-6.6.3-.2.2-.7-.1-.8L25.9 7.9c-.1-.1-.2-.1-.3.1Z" />
    </svg>
  )
}

function ReviewCard({ review, labels }: { review: Review; labels: ReturnType<typeof useT>['t']['home']['reviews'] }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = review.text.length > LONG_TEXT_THRESHOLD
  // Follows the review's own language, not the active UI locale - an
  // Arabic testimonial must stay right-aligned even when the site chrome
  // is switched to English, and vice versa for the one English review.
  const dir = review.lang === 'en' ? 'ltr' : 'rtl'
  const name = review.name ?? labels.fallbackName

  return (
    <figure className="relative mb-5 break-inside-avoid rounded-2xl border border-[#617A55]/15 bg-white p-6 shadow-[0_1px_2px_rgba(37,49,31,0.04)] sm:p-7">
      <QuoteMark />
      <blockquote
        dir={dir}
        className={`relative text-[15px] leading-[1.9] text-[#25311f] sm:text-base ${
          isLong && !expanded ? 'line-clamp-3' : ''
        }`}
      >
        {review.text.split('\n').map((paragraph, index) => (
          <p key={index} className={index > 0 ? 'mt-3' : ''}>
            {paragraph}
          </p>
        ))}
      </blockquote>

      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className={`mt-3 inline-flex min-h-11 items-center rounded-full border border-[#617A55]/25 px-4 text-sm font-semibold text-[#617A55] transition hover:bg-[#D6E2B6]/40 ${focusRing}`}
        >
          {expanded ? labels.readLess : labels.readMore}
        </button>
      )}

      <figcaption className="mt-5 inline-flex rounded-full bg-[#D6E2B6]/50 px-4 py-1.5 text-xs font-semibold text-[#617A55]">
        {name}
      </figcaption>
    </figure>
  )
}

// `reviews` here must already be filtered to what's safe to show (approved,
// or all of them under the dev-only preview) by the server component before
// this client component is rendered. A Client Component's props get
// serialized into the page's RSC payload regardless of what it chooses to
// render, so filtering inside this component instead would still ship
// unapproved review text to the browser even while displaying nothing -
// filtering has to happen server-side, before the data ever crosses into a
// client prop, not just before the DOM render.
export default function ReviewsSection({ reviews: visible }: { reviews: Review[] }) {
  const { t, dir } = useT()
  const labels = t.home.reviews
  const scrollerRef = useRef<HTMLUListElement>(null)

  if (visible.length === 0) return null

  // "Next" always means forward in reading order. Browsers differ on the
  // sign of scrollLeft in RTL (some go negative, some stay positive), so
  // rather than relying on that, flip the requested direction using the
  // locale's own dir instead of inspecting the DOM.
  function scrollByCard(direction: 1 | -1) {
    const node = scrollerRef.current
    if (!node) return
    const card = node.querySelector('li')
    const amount = card ? card.getBoundingClientRect().width + 16 : node.clientWidth * 0.85
    const signed = dir === 'rtl' ? -direction : direction
    node.scrollBy({ left: signed * amount, behavior: 'smooth' })
  }

  const simple = visible.length < 3

  return (
    <section className="border-t border-[#617A55]/10 bg-[#F7F6F0] px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center font-serif text-4xl text-[#25311f] sm:text-5xl">
          {labels.heading}
        </h2>

        {simple ? (
          <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center gap-5">
            {visible.map((review) => (
              <div key={review.id} className="w-full">
                <ReviewCard review={review} labels={labels} />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Desktop/tablet: soft quote-card grid, varied heights via columns */}
            <div className="mt-10 hidden sm:block">
              <div className="columns-2 gap-5 lg:columns-3">
                {visible.map((review) => (
                  <ReviewCard key={review.id} review={review} labels={labels} />
                ))}
              </div>
            </div>

            {/* Mobile: horizontal swipe carousel with scroll-snap and a next-card peek */}
            <div className="relative mt-10 sm:hidden">
              <ul
                ref={scrollerRef}
                aria-label={labels.carouselAriaLabel}
                className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 ps-1 pe-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {visible.map((review) => (
                  <li key={review.id} className="w-[85%] shrink-0 snap-start">
                    <ReviewCard review={review} labels={labels} />
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => scrollByCard(-1)}
                  aria-label={labels.previous}
                  className={`grid size-11 place-items-center rounded-full border border-[#617A55]/25 text-[#617A55] transition hover:bg-[#D6E2B6]/40 ${focusRing}`}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => scrollByCard(1)}
                  aria-label={labels.next}
                  className={`grid size-11 place-items-center rounded-full border border-[#617A55]/25 text-[#617A55] transition hover:bg-[#D6E2B6]/40 ${focusRing}`}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

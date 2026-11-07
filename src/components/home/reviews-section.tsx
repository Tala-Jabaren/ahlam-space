'use client'

import { useState, useSyncExternalStore } from 'react'
import { useT } from '@/i18n/i18n-context'
import type { ReviewRow } from '@/lib/reviews'
import WordRevealText from './word-reveal-text'

// Every card shows only the first ~5 "sentences" by default. These reviews
// don't punctuate consistently - some use periods/!/؟, some rely on \n line
// breaks between thoughts instead and have almost no punctuation inside a
// line - so a sentence boundary here is EITHER a sentence-ending mark or a
// line break, whichever comes first, not a character-count cutoff.
const EXCERPT_SENTENCE_COUNT = 5

function splitIntoSentenceChunks(text: string): string[] {
  return text.match(/[^.!؟\n]+[.!؟\n]?/g) ?? [text]
}

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55684A]'

function QuoteMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="absolute -top-2 start-4 size-10 text-[#55684A]/10 sm:size-12" fill="currentColor">
      <path d="M9.6 8C5.4 10.9 3 14.6 3 19.1c0 4.1 2.6 6.9 6 6.9 3 0 5.2-2.3 5.2-5.3 0-2.8-1.9-4.9-4.4-5.2-.3 0-.5-.2-.4-.5.6-2.5 2.6-5 5.4-6.6.3-.2.2-.7-.1-.8L9.9 7.9c-.1-.1-.2-.1-.3.1Zm16 0c-4.2 2.9-6.6 6.6-6.6 11.1 0 4.1 2.6 6.9 6 6.9 3 0 5.2-2.3 5.2-5.3 0-2.8-1.9-4.9-4.4-5.2-.3 0-.5-.2-.4-.5.6-2.5 2.6-5 5.4-6.6.3-.2.2-.7-.1-.8L25.9 7.9c-.1-.1-.2-.1-.3.1Z" />
    </svg>
  )
}

type ReviewLabels = ReturnType<typeof useT>['t']['home']['reviews']

function ReviewCard({
  review,
  labels,
  expanded,
  onToggleExpanded,
  interactive,
}: {
  review: ReviewRow
  labels: ReviewLabels
  expanded: boolean
  onToggleExpanded: () => void
  interactive: boolean
}) {
  const dir = review.lang === 'en' ? 'ltr' : 'rtl'
  const name = review.name ?? labels.fallbackName
  const initial = name.charAt(0)

  const chunks = splitIntoSentenceChunks(review.body)
  const hasMore = chunks.length > EXCERPT_SENTENCE_COUNT
  const excerptText = chunks.slice(0, EXCERPT_SENTENCE_COUNT).join('').replace(/\n+$/, '').trimEnd()
  const displayedText = expanded || !hasMore ? review.body : excerptText

  return (
    <figure
      className={`relative mt-6 flex h-full flex-col rounded-2xl border border-[#55684A]/15 bg-white p-6 shadow-[0_1px_2px_rgba(52,71,43,0.05)] sm:p-7 ${
        expanded ? '' : 'max-h-[420px] overflow-hidden'
      }`}
    >
      {/* The avatar overlaps the card's own top edge - the li wrapper's
          mt-6 is what keeps it from being clipped by the strip's overflow
          container. */}
      <div className="absolute -top-6 start-6">
        {review.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={review.photo_url}
            alt=""
            className="size-12 shrink-0 rounded-full border-4 border-[#F6F5EE] object-cover shadow-sm"
          />
        ) : (
          <span className="grid size-12 shrink-0 place-items-center rounded-full border-4 border-[#F6F5EE] bg-[#55684A] text-base font-semibold text-white shadow-sm">
            {initial}
          </span>
        )}
      </div>

      <QuoteMark />
      <blockquote dir={dir} className={`relative mt-4 text-[15px] leading-[1.9] text-[#34472B] sm:text-base ${expanded ? '' : 'line-clamp-5'}`}>
        {displayedText.split('\n').map((paragraph, index) => (
          <p key={index} className={index > 0 ? 'mt-3' : ''}>
            {paragraph}
          </p>
        ))}
      </blockquote>

      <div className="mt-auto pt-3">
        {hasMore && (
          <button
            type="button"
            tabIndex={interactive ? 0 : -1}
            onClick={onToggleExpanded}
            aria-expanded={expanded}
            className={`inline-flex min-h-11 items-center rounded-full border border-[#55684A]/25 px-4 text-sm font-semibold text-[#55684A] underline transition hover:bg-[#E4ECD6]/50 ${focusRing}`}
          >
            {expanded ? labels.readLess : labels.readMore}
          </button>
        )}

        <figcaption className="mt-5 text-sm font-semibold text-[#34472B]">{name}</figcaption>
      </div>
    </figure>
  )
}

// `reviews` here must already be filtered to what's safe to show (approved,
// or all of them under the dev-only preview) by the server component before
// this client component is rendered - its props are serialized into the
// page's RSC payload regardless of what it renders, so filtering here
// instead would still ship unapproved review text to the browser. RLS backs
// this up independently.
export default function ReviewsSection({ reviews }: { reviews: ReviewRow[] }) {
  const { t } = useT()
  const labels = t.home.reviews
  const [manuallyPaused, setManuallyPaused] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const reducedMotion = useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)')
      query.addEventListener('change', onChange)
      return () => query.removeEventListener('change', onChange)
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false
  )

  if (reviews.length === 0) return null

  const isPaused = manuallyPaused || hovering || expandedIds.size > 0
  const doubled = reducedMotion ? reviews : [...reviews, ...reviews]

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <section className="scroll-reveal border-t border-[#55684A]/10 bg-[#F6F5EE] px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <WordRevealText
          as="h2"
          text={labels.heading}
          dimBackground="#F6F5EE"
          className="block text-center font-serif text-4xl text-[#34472B] sm:text-5xl"
        />

        {!reducedMotion && (
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={() => setManuallyPaused((value) => !value)}
              aria-pressed={manuallyPaused}
              className={`inline-flex min-h-11 items-center rounded-full border border-[#55684A]/25 px-4 text-sm font-semibold text-[#55684A] transition hover:bg-[#E4ECD6]/40 ${focusRing}`}
            >
              {manuallyPaused ? labels.resumeReviews : labels.pauseReviews}
            </button>
          </div>
        )}

        <div
          className={`mt-10 ${reducedMotion ? 'overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden' : 'overflow-hidden'}`}
          onPointerEnter={(event) => {
            if (event.pointerType === 'mouse') setHovering(true)
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === 'mouse') setHovering(false)
          }}
          onFocus={() => setHovering(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHovering(false)
          }}
        >
          <ul
            aria-label={labels.carouselAriaLabel}
            data-paused={reducedMotion ? undefined : isPaused}
            className={`flex w-max items-start gap-5 ${reducedMotion ? 'snap-x snap-mandatory' : 'reviews-strip-track-animate'}`}
          >
            {doubled.map((review, index) => {
              const interactive = index < reviews.length
              return (
                <li
                  key={`${review.id}-${index}`}
                  aria-hidden={interactive ? undefined : 'true'}
                  className="w-[85%] shrink-0 snap-start sm:w-[320px] lg:w-[380px]"
                >
                  <ReviewCard
                    review={review}
                    labels={labels}
                    expanded={expandedIds.has(review.id)}
                    onToggleExpanded={() => toggleExpanded(review.id)}
                    interactive={interactive}
                  />
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}

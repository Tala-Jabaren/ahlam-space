'use client'

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Flower2, Leaf, UserRound } from 'lucide-react'
import { useT } from '@/i18n/i18n-context'
import type { ReviewRow } from '@/lib/reviews'
import ReviewDialog from './review-dialog'
import styles from './reviews-section.module.css'

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55684A]'
const FALLBACK_ICONS = [UserRound, Leaf, Flower2]

function useCardsPerView() {
  return useSyncExternalStore(
    (onChange) => {
      const desktop = window.matchMedia('(min-width: 1024px)')
      const tablet = window.matchMedia('(min-width: 640px)')
      desktop.addEventListener('change', onChange)
      tablet.addEventListener('change', onChange)
      return () => {
        desktop.removeEventListener('change', onChange)
        tablet.removeEventListener('change', onChange)
      }
    },
    () => (window.matchMedia('(min-width: 1024px)').matches ? 3 : window.matchMedia('(min-width: 640px)').matches ? 2 : 1),
    // Mobile-first server snapshot, same reasoning as reducedMotion below -
    // never guess a wider layout than the client will actually render.
    () => 1
  )
}

function QuoteMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className={`${styles.quoteMark} size-9 text-[var(--blue-soft)]/50`} fill="currentColor">
      <path d="M9.6 8C5.4 10.9 3 14.6 3 19.1c0 4.1 2.6 6.9 6 6.9 3 0 5.2-2.3 5.2-5.3 0-2.8-1.9-4.9-4.4-5.2-.3 0-.5-.2-.4-.5.6-2.5 2.6-5 5.4-6.6.3-.2.2-.7-.1-.8L9.9 7.9c-.1-.1-.2-.1-.3.1Zm16 0c-4.2 2.9-6.6 6.6-6.6 11.1 0 4.1 2.6 6.9 6 6.9 3 0 5.2-2.3 5.2-5.3 0-2.8-1.9-4.9-4.4-5.2-.3 0-.5-.2-.4-.5.6-2.5 2.6-5 5.4-6.6.3-.2.2-.7-.1-.8L25.9 7.9c-.1-.1-.2-.1-.3.1Z" />
    </svg>
  )
}

type ReviewLabels = ReturnType<typeof useT>['t']['home']['reviews']

function ReviewCard({
  review,
  index,
  labels,
  onOpenFull,
}: {
  review: ReviewRow
  index: number
  labels: ReviewLabels
  onOpenFull: (review: ReviewRow, trigger: HTMLButtonElement | null) => void
}) {
  const dir = review.lang === 'en' ? 'ltr' : 'rtl'
  const name = review.name ?? labels.fallbackName
  const quoteRef = useRef<HTMLQuoteElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [hasMore, setHasMore] = useState(false)
  const FallbackIcon = FALLBACK_ICONS[index % FALLBACK_ICONS.length]

  // line-clamp (CSS) does the actual truncation - this only decides
  // whether the "read more" button is worth showing at all, by comparing
  // the clamped element's real scrollHeight against its clamped
  // clientHeight. No layout shift: the clamp box's height never changes
  // because of this, only whether the button renders below it.
  useEffect(() => {
    const node = quoteRef.current
    if (!node) return
    const measure = () => setHasMore(node.scrollHeight > node.clientHeight + 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [review.body])

  return (
    <figure className={styles.cardSurface}>
      <QuoteMark />
      <blockquote ref={quoteRef} dir={dir} className={`${styles.quote} mt-8 text-[15px] leading-[1.8] text-[#34472B] sm:text-base`}>
        {review.body.split('\n').map((paragraph, paragraphIndex) => (
          <p key={paragraphIndex} className={paragraphIndex > 0 ? 'mt-2' : ''}>
            {paragraph}
          </p>
        ))}
      </blockquote>

      {hasMore && (
        <button
          ref={buttonRef}
          type="button"
          onClick={() => onOpenFull(review, buttonRef.current)}
          className={`mt-2 inline-flex min-h-9 w-fit items-center text-sm font-semibold text-[#55684A] underline underline-offset-4 ${focusRing}`}
        >
          {labels.readMore}
        </button>
      )}

      {/* DOM order is name -> dash -> avatar, not the reverse: in this RTL
          card, the first child renders at the reading-start (right) edge,
          so this order is what actually puts the name on the right and
          the avatar on the left, matching the reference design. */}
      <figcaption className={styles.footer}>
        <span className="min-w-0 truncate text-sm font-semibold text-[#34472B]">{name}</span>
        <span aria-hidden="true" className="shrink-0 text-[#34472B]/40">
          —
        </span>
        <span className={styles.avatar} aria-hidden="true">
          {review.photo_url ? (
            <Image src={review.photo_url} alt="" width={40} height={40} className={styles.avatarImg} />
          ) : (
            <FallbackIcon size={18} strokeWidth={1.75} />
          )}
        </span>
      </figcaption>
    </figure>
  )
}

// `reviews` must already be filtered to what's safe to show (approved, or
// all of them under the dev-only preview) by the server component before
// this client component is rendered - see page.tsx.
export default function ReviewsSection({ reviews }: { reviews: ReviewRow[] }) {
  const { t, dir } = useT()
  const labels = t.home.reviews
  const headingId = useId()

  const reducedMotion = useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)')
      query.addEventListener('change', onChange)
      return () => query.removeEventListener('change', onChange)
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false
  )

  const cardsPerView = useCardsPerView()
  const pageCount = Math.max(1, Math.ceil(reviews.length / cardsPerView))
  const [rawPage, setRawPage] = useState(0)
  // Clamped on read, not via a setState-in-effect - pageCount can shrink
  // when cardsPerView grows (a breakpoint crossing), and the raw value
  // self-corrects the moment it's read again rather than needing a synced
  // effect just to cap it.
  const page = Math.min(rawPage, pageCount - 1)
  const pendingScrollRef = useRef(false)
  const behaviorRef = useRef<ScrollBehavior>('instant')
  const trackRef = useRef<HTMLUListElement>(null)
  const cardRefs = useRef<(HTMLLIElement | null)[]>([])

  const [hovering, setHovering] = useState(false)
  const [focusWithin, setFocusWithin] = useState(false)
  const [touching, setTouching] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [openReview, setOpenReview] = useState<ReviewRow | null>(null)
  const openTriggerRef = useRef<HTMLButtonElement | null>(null)

  function pageStart(targetPage: number) {
    return Math.min(targetPage * cardsPerView, Math.max(0, reviews.length - cardsPerView))
  }

  function goTo(targetPage: number, behavior: ScrollBehavior) {
    pendingScrollRef.current = true
    behaviorRef.current = behavior
    setRawPage(((targetPage % pageCount) + pageCount) % pageCount)
  }
  function goNext() {
    goTo(page + 1, reducedMotion ? 'instant' : 'smooth')
  }
  function goPrev() {
    goTo(page - 1, reducedMotion ? 'instant' : 'smooth')
  }

  // Programmatic navigation only (buttons/dots/keyboard/autoplay) - a
  // manual swipe updates `page` too (see the scroll listener below) but
  // never sets this flag, so it never fights the user's own scroll.
  useEffect(() => {
    if (!pendingScrollRef.current) return
    pendingScrollRef.current = false
    const target = cardRefs.current[pageStart(page)]
    target?.scrollIntoView({ inline: 'start', block: 'nearest', behavior: behaviorRef.current })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, cardsPerView])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    let raf = 0

    function leadingIndex() {
      if (!el) return 0
      const containerRect = el.getBoundingClientRect()
      let closest = 0
      let closestDist = Infinity
      cardRefs.current.forEach((card, cardIndex) => {
        if (!card) return
        const rect = card.getBoundingClientRect()
        const dist = dir === 'rtl' ? Math.abs(rect.right - containerRect.right) : Math.abs(rect.left - containerRect.left)
        if (dist < closestDist) {
          closestDist = dist
          closest = cardIndex
        }
      })
      return closest
    }

    function onScroll() {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        if (pendingScrollRef.current) return
        const nearestPage = Math.min(pageCount - 1, Math.round(leadingIndex() / cardsPerView))
        setRawPage((current) => (current === nearestPage ? current : nearestPage))
      })
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [cardsPerView, pageCount, dir])

  const isPaused = hovering || focusWithin || touching || dialogOpen || reducedMotion || pageCount <= 1
  useEffect(() => {
    if (isPaused) return
    const id = setInterval(goNext, 6000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused, page, pageCount, cardsPerView])

  function openFull(review: ReviewRow, trigger: HTMLButtonElement | null) {
    openTriggerRef.current = trigger
    setOpenReview(review)
    setDialogOpen(true)
  }
  function closeFull() {
    setDialogOpen(false)
  }

  if (reviews.length === 0) return null

  const leadText = labels.heading.endsWith(labels.headingAccent)
    ? labels.heading.slice(0, labels.heading.length - labels.headingAccent.length)
    : labels.heading

  return (
    <section className="scroll-reveal border-t border-[#55684A]/10 bg-[#F6F5EE] px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E4ECD6] px-3.5 py-1.5 text-xs font-semibold text-[#34472B]">
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-3.5" fill="currentColor">
              <path d="M2 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8l-4 3.5V14H4a2 2 0 0 1-2-2V4Z" />
            </svg>
            {labels.eyebrow}
          </span>
          <h2 id={headingId} aria-label={labels.heading} className="mt-4 font-serif text-4xl text-[#34472B] sm:text-5xl">
            <span aria-hidden="true">
              {leadText}
              <span className="relative inline-block">
                {labels.headingAccent}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 100 14"
                  preserveAspectRatio="none"
                  className="accent-underline pointer-events-none absolute inset-x-0 -bottom-1 h-3 w-full"
                >
                  <path d="M2 8 Q 50 1 98 7" fill="none" stroke="#55684A" strokeWidth="4" strokeLinecap="round" pathLength={1} />
                </svg>
              </span>
            </span>
          </h2>
          <p className="mt-3 text-[#34472B]/70">{labels.subtitle}</p>
        </div>

        <div
          role="group"
          aria-roledescription="carousel"
          aria-labelledby={headingId}
          tabIndex={0}
          className={`relative mt-10 outline-none ${focusRing}`}
          onPointerEnter={(event) => {
            if (event.pointerType === 'mouse') setHovering(true)
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === 'mouse') setHovering(false)
          }}
          onFocus={() => setFocusWithin(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusWithin(false)
          }}
          onTouchStart={() => setTouching(true)}
          onTouchEnd={() => {
            window.setTimeout(() => setTouching(false), 1200)
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault()
              if (dir === 'rtl') goNext()
              else goPrev()
            } else if (event.key === 'ArrowRight') {
              event.preventDefault()
              if (dir === 'rtl') goPrev()
              else goNext()
            }
          }}
        >
          <ul ref={trackRef} aria-label={labels.carouselAriaLabel} className={styles.track}>
            {reviews.map((review, index) => (
              <li
                key={review.id}
                ref={(element) => {
                  cardRefs.current[index] = element
                }}
                className={styles.card}
              >
                <ReviewCard review={review} index={index} labels={labels} onOpenFull={openFull} />
              </li>
            ))}
          </ul>

          {pageCount > 1 && (
            <>
              <button
                type="button"
                onClick={goPrev}
                aria-label={labels.previousReview}
                className={`${styles.arrow} ${styles.arrowPrev} ${focusRing}`}
              >
                {dir === 'rtl' ? <ChevronRight aria-hidden="true" size={20} /> : <ChevronLeft aria-hidden="true" size={20} />}
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label={labels.nextReview}
                className={`${styles.arrow} ${styles.arrowNext} ${focusRing}`}
              >
                {dir === 'rtl' ? <ChevronLeft aria-hidden="true" size={20} /> : <ChevronRight aria-hidden="true" size={20} />}
              </button>
            </>
          )}
        </div>

        {pageCount > 1 && (
          <div className={styles.dots}>
            {Array.from({ length: pageCount }, (_, index) => (
              <button
                key={index}
                type="button"
                data-active={page === index}
                aria-current={page === index || undefined}
                aria-label={`${labels.goToReview} ${index + 1}`}
                onClick={() => goTo(index, reducedMotion ? 'instant' : 'smooth')}
                className={`${styles.dot} ${focusRing}`}
              />
            ))}
          </div>
        )}
      </div>

      <ReviewDialog review={openReview} labels={labels} dir={dir} open={dialogOpen} onClose={closeFull} triggerRef={openTriggerRef} />
    </section>
  )
}

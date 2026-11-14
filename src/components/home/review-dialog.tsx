'use client'

import { useEffect, useId, useRef, type RefObject } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'
import type { ReviewRow } from '@/lib/reviews'
import styles from './reviews-section.module.css'

type DialogLabels = { dialogTitle: string; dialogClose: string; fallbackName: string }

// Same native-<dialog> pattern as MobileNavigation (public)/mobile-navigation.tsx:
// showModal() for the built-in top-layer + Escape handling, a manual Tab-key
// focus trap (the browser doesn't give us one for free inside <dialog>), a
// geometry-based backdrop-click check (clicking the dialog's own padding vs.
// clicking outside its box both fire on the <dialog> element itself, since
// the backdrop is a separate pseudo-element - only a genuinely outside click
// should close it), and restoring body scroll + focus to the trigger on close.
export default function ReviewDialog({
  review,
  labels,
  dir,
  open,
  onClose,
  triggerRef,
}: {
  review: ReviewRow | null
  labels: DialogLabels
  dir: 'rtl' | 'ltr'
  open: boolean
  onClose: () => void
  triggerRef: RefObject<HTMLButtonElement | null>
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const element = dialog.current
    if (!element) return
    const trigger = triggerRef.current
    const root = document.documentElement
    const body = document.body
    const oldRootOverflow = root.style.overflow
    const oldBodyOverflow = body.style.overflow
    const oldGutter = root.style.scrollbarGutter
    const gap = window.innerWidth - root.clientWidth

    if (gap > 0 && CSS.supports('scrollbar-gutter', 'stable')) root.style.scrollbarGutter = 'stable'
    root.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    element.showModal()
    closeButton.current?.focus({ preventScroll: true })

    return () => {
      if (element.open) element.close()
      root.style.overflow = oldRootOverflow
      body.style.overflow = oldBodyOverflow
      root.style.scrollbarGutter = oldGutter
      if (trigger?.isConnected) trigger.focus({ preventScroll: true })
    }
  }, [open, triggerRef])

  if (!review) return null
  const name = review.name ?? labels.fallbackName
  const reviewDir = review.lang === 'en' ? 'ltr' : 'rtl'

  return (
    <dialog
      ref={dialog}
      dir={dir}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const box = event.currentTarget.getBoundingClientRect()
        const outside =
          event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom
        if (outside) onClose()
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const targets = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)')).filter(
          (element) => element.getClientRects().length > 0
        )
        const first = targets[0]
        const last = targets.at(-1)
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }}
    >
      <h2 id={titleId} className="sr-only">
        {labels.dialogTitle}
      </h2>
      <button ref={closeButton} type="button" className={styles.dialogClose} aria-label={labels.dialogClose} onClick={onClose}>
        <X aria-hidden="true" size={18} />
      </button>

      <blockquote dir={reviewDir} className={`${styles.dialogBody} text-[15px] text-[#34472B] sm:text-base`}>
        {review.body.split('\n').map((paragraph, index) => (
          <p key={index} className={index > 0 ? 'mt-3' : ''}>
            {paragraph}
          </p>
        ))}
      </blockquote>

      <figcaption className={styles.dialogFooter}>
        <span className="min-w-0 truncate text-sm font-semibold text-[#34472B]">{name}</span>
        <span aria-hidden="true" className="shrink-0 text-[#34472B]/40">
          —
        </span>
        <span className={styles.avatar} aria-hidden="true">
          {review.photo_url ? (
            <Image src={review.photo_url} alt="" width={40} height={40} className={styles.avatarImg} />
          ) : (
            name.trim().charAt(0)
          )}
        </span>
      </figcaption>
    </dialog>
  )
}

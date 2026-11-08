import { Fragment, type ElementType } from 'react'

type WordStyle = React.CSSProperties & { animationRange?: string; '--word-full'?: string }

const PUNCTUATION = /[،.؟!]/g

// Splits on spaces only - never on letters, since Arabic letters connect
// within a word and splitting there would break shaping. Each word gets
// its own slice of the parent's scroll-through range (i/n as a
// percentage, computed here rather than with CSS calc() so it doesn't
// depend on calc()-in-animation-range support) - see .word-reveal in
// globals.css for the actual animation.
//
// accentWord (optional) marks one word, compared with trailing
// punctuation stripped, to end on the sage accent colour instead of the
// heading's own colour and draw in a hand-drawn underline - both run on
// the very same span as the word-reveal animation itself.
export default function WordRevealText({
  text,
  as = 'span',
  className = '',
  fullColor,
  dimBackground,
  accentWord,
}: {
  text: string
  as?: ElementType
  className?: string
  fullColor?: string
  dimBackground?: string
  accentWord?: string
}) {
  const Tag = as
  const words = text.split(' ').filter(Boolean)
  const n = words.length
  const accentBare = accentWord?.replace(PUNCTUATION, '')

  return (
    <Tag
      aria-label={text}
      className={`word-reveal ${className}`}
      style={
        {
          ...(fullColor ? { '--word-full': fullColor } : {}),
          ...(dimBackground ? { '--word-reveal-bg': dimBackground } : {}),
        } as React.CSSProperties
      }
    >
      <span aria-hidden="true">
        {words.map((word, i) => {
          const isAccent = accentBare !== undefined && word.replace(PUNCTUATION, '') === accentBare
          return (
            // The space is a sibling text node, outside the inline-block
            // span - a space INSIDE an inline-block doesn't give the line
            // box a break opportunity between it and the next word's
            // inline-block, so it has to live between them, not inside one.
            <Fragment key={i}>
              <span
                className={`word relative inline-block ${isAccent ? 'text-[#55684A]' : ''}`}
                style={
                  {
                    // Scoped to the "entry" phase specifically (the subject
                    // crossing INTO view), not the bare/"cover" range - a
                    // bare percentage is shorthand for cover 0%..100%, which
                    // spans the subject's entire scroll lifetime including
                    // the long "just sitting in view" middle, so nearly all
                    // of a short heading's reveal would finish within the
                    // first few percent of that range (right as it enters)
                    // instead of across a meaningful scroll distance.
                    animationRange: `entry ${Math.round((i / n) * 100)}% entry ${Math.round(((i + 1) / n) * 100)}%`,
                    ...(isAccent ? { '--word-full': '#55684A' } : {}),
                  } as WordStyle
                }
              >
                {word}
                {isAccent && (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 100 14"
                    preserveAspectRatio="none"
                    className="accent-underline pointer-events-none absolute inset-x-0 -bottom-1 h-3 w-full"
                  >
                    <path d="M2 8 Q 50 1 98 7" fill="none" stroke="#55684A" strokeWidth="4" strokeLinecap="round" pathLength={1} />
                  </svg>
                )}
              </span>
              {i < n - 1 ? ' ' : ''}
            </Fragment>
          )
        })}
      </span>
    </Tag>
  )
}

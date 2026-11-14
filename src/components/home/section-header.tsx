// Shared copy shape for every caller of SectionHeader (ArcGallerySection,
// ServicesSection, ...) - one type instead of each caller re-declaring the
// same four fields.
export type SectionHeaderCopy = {
  pill?: string
  heading: string
  headingAccent?: string
  subtitle?: string
}

// Shared pill + heading (+ optional accent-underline substring) + subtitle
// block, factored out of ReviewsSection's own header markup so stats and
// services can use the exact same look. `headingAccent`, when given, must
// be a literal trailing substring of `heading` (not matched some other
// way) - the same convention ReviewsSection already used before this was
// extracted.
export default function SectionHeader({
  pill,
  heading,
  headingAccent,
  subtitle,
  headingId,
  className = '',
}: SectionHeaderCopy & { headingId?: string; className?: string }) {
  const leadText = headingAccent && heading.endsWith(headingAccent) ? heading.slice(0, heading.length - headingAccent.length) : heading

  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      {pill && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E4ECD6] px-3.5 py-1.5 text-xs font-semibold text-[#34472B]">
          {pill}
        </span>
      )}
      <h2 id={headingId} aria-label={heading} className={`font-serif text-4xl text-[#34472B] sm:text-5xl ${pill ? 'mt-4' : ''}`}>
        <span aria-hidden="true">
          {leadText}
          {headingAccent && (
            <span className="relative inline-block">
              {headingAccent}
              <svg
                aria-hidden="true"
                viewBox="0 0 100 14"
                preserveAspectRatio="none"
                className="accent-underline pointer-events-none absolute inset-x-0 -bottom-1 h-3 w-full"
              >
                <path d="M2 8 Q 50 1 98 7" fill="none" stroke="#55684A" strokeWidth="4" strokeLinecap="round" pathLength={1} />
              </svg>
            </span>
          )}
        </span>
      </h2>
      {subtitle && <p className="mt-3 text-[#34472B]/70">{subtitle}</p>}
    </div>
  )
}

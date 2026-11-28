import Image from 'next/image'
import Link from 'next/link'
import { loginHref } from '@/lib/login-redirect'
import WordRevealText from './word-reveal-text'

export type HeroCopy = {
  heroHeadingLine1: string
  heroHeadingLine2: string
  heroParagraph: string
  heroCtaBookNow: string
  heroJoinCta: string
  heroImageAlt: string
  heroChips: string[]
}

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 shrink-0 text-white" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

// Full-bleed photo hero with the header floating transparently on top of
// it (see SiteHeader, which switches to the floating pill after ~40px of
// scroll). <main> itself gives this page no top padding (see
// MainContent), so the section starts at the very top of the viewport
// without needing any margin trick. bg-[#34472B] on the section is a
// safety net, not decoration: if the photo fails to load, that solid
// colour is what's actually behind it, so the white header/text stay
// readable either way.
export default function HeroSection({
  copy,
  dir,
  isAuthenticated,
}: {
  copy: HeroCopy
  dir: 'rtl' | 'ltr'
  isAuthenticated: boolean
}) {
  return (
    <section className="relative flex min-h-[100svh] items-end overflow-hidden bg-[#34472B]">
      <Image
        src="/images/newhero.png"
        alt={copy.heroImageAlt}
        fill
        priority
        sizes="100vw"
        className="hero-kenburns object-cover"
        style={{ objectPosition: '42% 12%' }}
      />
      {/* Top scrim: keeps the header's white logo/nav legible over
          whatever the photo happens to show right at the top edge,
          regardless of the side scrim below (which is for the headline,
          not the header). */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[220px]"
        style={{ background: 'linear-gradient(to bottom, rgba(52,71,43,0.75) 0%, rgba(52,71,43,0) 100%)' }}
      />
      {/* Scrim: dark on the text side (end, i.e. right in RTL), fading to
          transparent toward the subject - mirrored for LTR so the text
          side is always the darker one regardless of language. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            dir === 'rtl'
              ? 'linear-gradient(to left, rgba(52,71,43,0.82) 0%, rgba(52,71,43,0.55) 35%, rgba(52,71,43,0.15) 65%, rgba(52,71,43,0) 100%)'
              : 'linear-gradient(to right, rgba(52,71,43,0.82) 0%, rgba(52,71,43,0.55) 35%, rgba(52,71,43,0.15) 65%, rgba(52,71,43,0) 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#34472B]/70 to-transparent"
      />

      <div dir={dir} className="relative z-10 w-full px-5 pb-16 pt-32 sm:px-8 sm:pb-20 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <h1 className="-translate-y-4 text-balance leading-[1.05] text-white" style={{ fontSize: 'clamp(2.75rem, 6.6vw, 6rem)' }}>
              <WordRevealText text={copy.heroHeadingLine1} reveal="load" className="block" />
              <WordRevealText text={copy.heroHeadingLine2} reveal="load" className="block" />
            </h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-white/85 sm:text-lg">{copy.heroParagraph}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={isAuthenticated ? '/classes' : loginHref('/classes')}
                className={`inline-flex min-h-12 items-center justify-center rounded-full bg-blue-soft px-7 py-3 text-sm font-semibold text-blue-deep transition hover:bg-blue-mist ${focusRing}`}
              >
                {copy.heroCtaBookNow}
              </Link>
              {!isAuthenticated && (
                <Link
                  href="/sign-up"
                  className={`hero-chip-glass inline-flex min-h-12 items-center justify-center rounded-full px-7 py-3 text-sm font-semibold text-white transition hover:bg-white/25 ${focusRing}`}
                >
                  {copy.heroJoinCta}
                </Link>
              )}
            </div>

            <ul className="mt-8 flex flex-wrap gap-3">
              {copy.heroChips.map((chip) => (
                <li key={chip} className="hero-chip-glass flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-white">
                  <CheckIcon />
                  {chip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

import Image from 'next/image'
import Link from 'next/link'

export type HeroCopy = {
  heroHeadingLine1: string
  heroHeadingLine2: string
  heroParagraph: string
  heroCtaExplore: string
  heroCtaServices: string
  heroImageAlt: string
  heroChips: string[]
}

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55684A]'

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 shrink-0 text-[#55684A]" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

// Fixed left-to-right in both languages, same convention as the previous
// hero (the photo always sits toward the start of the layout, text always
// toward the end) - only the text block inside follows the active
// language's direction.
export default function HeroSection({ copy, dir }: { copy: HeroCopy; dir: 'rtl' | 'ltr' }) {
  return (
    <section className="relative overflow-hidden bg-[#F6F5EE] pb-28 pt-10 sm:pt-14 lg:pb-36 lg:pt-20" dir="ltr">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:px-10">
        <div className="relative mx-auto w-full max-w-md lg:mx-0">
          <span
            aria-hidden="true"
            className="absolute -left-6 -top-6 size-28 rounded-full border border-[#55684A]/25"
          />
          <span aria-hidden="true" className="absolute -left-1 -top-1 size-2.5 rounded-full bg-[#55684A]" />

          <div className="relative aspect-[4/5] overflow-hidden rounded-t-[9999px] rounded-b-3xl">
            <Image
              src="/images/hero1.jpeg"
              alt={copy.heroImageAlt}
              fill
              priority
              sizes="(min-width: 1024px) 480px, 90vw"
              className="object-cover"
            />
          </div>

          <span className="absolute end-4 top-10 inline-flex rounded-full bg-white px-4 py-1.5 text-xs font-bold tracking-wide text-[#34472B] shadow-sm">
            MOVE
          </span>
          <span className="absolute -start-4 top-[38%] inline-flex rounded-full bg-[#34472B] px-4 py-1.5 text-xs font-bold tracking-wide text-white shadow-sm">
            BALANCE
          </span>
          <span className="absolute end-6 bottom-24 inline-flex rounded-full bg-[#EFE6D2] px-4 py-1.5 text-xs font-bold tracking-wide text-[#34472B] shadow-sm">
            BLOOM
          </span>

          <Link
            href="/classes"
            className={`absolute bottom-4 start-4 inline-flex min-h-11 items-center rounded-full bg-[#34472B] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#55684A] ${focusRing}`}
          >
            {copy.heroCtaExplore}
          </Link>
        </div>

        <div dir={dir} className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#55684A]" dir="ltr">
            MOVE · BALANCE · BLOOM
          </p>
          <h1 className="mt-5 font-serif text-4xl leading-tight text-[#34472B] sm:text-5xl">
            {copy.heroHeadingLine1}
            <br />
            {copy.heroHeadingLine2}
          </h1>
          <p className="mt-5 max-w-lg text-base leading-8 text-[#34472B]/80 sm:text-lg">
            {copy.heroParagraph}
          </p>

          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#34472B]/85">
            {copy.heroChips.map((chip) => (
              <li key={chip} className="flex items-center gap-1.5">
                <CheckIcon />
                {chip}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/classes"
              className={`inline-flex min-h-12 items-center justify-center rounded-full bg-[#55684A] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#34472B] ${focusRing}`}
            >
              {copy.heroCtaExplore}
            </Link>
            <a
              href="#services"
              className={`inline-flex min-h-12 items-center justify-center rounded-full border border-[#55684A]/40 px-7 py-3 text-sm font-semibold text-[#55684A] transition hover:bg-[#E4ECD6] ${focusRing}`}
            >
              {copy.heroCtaServices}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

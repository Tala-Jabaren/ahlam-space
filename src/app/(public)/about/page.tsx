import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getT } from '@/i18n/get-t'
import { getLocale } from '@/i18n/get-locale'
import { getDictionary } from '@/i18n/dictionaries'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = getDictionary(locale)
  return pageMetadata({ ...t.seo.about, path: '/about', locale })
}

const serviceIcons = [
  (
    <>
      <path d="M12 22c4-4 7-7.5 7-12a7 7 0 0 0-14 0c0 4.5 3 8 7 12Z" />
      <path d="M12 22V10" />
      <path d="M8 14c2.5 0 4 1.5 4 4" />
      <path d="M16 14c-2.5 0-4 1.5-4 4" />
    </>
  ),
  (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      <path d="M8 7h8M8 11h6" />
    </>
  ),
  (
    <>
      <circle cx="12" cy="5" r="2.5" />
      <path d="M12 8v5M8 21l4-8 4 8M5 14l7-2 7 2" />
    </>
  ),
]

function ServiceIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid size-12 place-items-center rounded-full bg-[#D6E2B6]/70 text-[#617A55]">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </span>
  )
}

export default async function AboutPage() {
  const { t, dir } = await getT()
  const services = t.about.services.map((service, index) => ({
    ...service,
    icon: serviceIcons[index],
  }))

  return (
    <div className="overflow-hidden bg-[#F7F6F0] text-[#25311f]" dir={dir}>
      {/* Fixed left-to-right composition (text column, then image column) in
          both languages, same reasoning as the home page hero. */}
      <section
        className="mx-auto grid min-h-[680px] max-w-[1350px] px-5 sm:px-8 md:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)] md:gap-16 lg:gap-20 lg:px-10"
        dir="ltr"
      >
        <div className="flex items-center py-14 sm:py-16">
          <div className="max-w-2xl" dir={dir}>
            <div className="flex items-center justify-end gap-4" dir="ltr">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#617A55]">
                ABOUT AHLAM
              </p>
              <span className="h-px w-16 bg-[#617A55]/35" />
            </div>

            <h1 className="mt-8 font-serif text-5xl leading-tight text-[#25311f] sm:text-6xl">
              {t.about.heading}
            </h1>
            <p className="mt-5 font-serif text-xl leading-9 text-[#617A55] sm:text-2xl">
              {t.about.subheading}
            </p>
            <p className="mt-7 max-w-xl text-base leading-8 text-[#4f5d49] sm:text-lg">
              {t.about.paragraph}
            </p>
            <Link
              href="#my-story"
              className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-[#617A55] px-7 py-3 text-sm font-semibold text-[#F7F6F0] transition-colors hover:bg-[#617A55]/90"
            >
              {t.about.ctaDiscoverStory}
            </Link>
          </div>
        </div>

        <div className="flex min-h-[520px] items-center justify-center py-8 md:min-h-[680px]">
          <div className="relative aspect-[1/1.05] w-full max-w-[600px] overflow-hidden rounded-[24px] shadow-sm">
            <Image
              src="/images/about2.png"
              alt={t.about.imageAlt}
              fill
              priority
              sizes="(min-width: 1350px) 600px, (min-width: 768px) 52vw, calc(100vw - 2.5rem)"
              className="object-cover object-center"
            />
          </div>
        </div>
      </section>

      <section id="my-story" className="relative px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div
          aria-hidden="true"
          className="absolute end-10 bottom-4 hidden h-52 w-44 opacity-15 md:block"
        >
          <span className="absolute bottom-0 end-20 h-48 w-px rotate-12 bg-[#617A55]" />
          <span className="absolute end-16 top-8 h-16 w-10 rotate-12 rounded-[100%_0_100%_0] bg-[#D6E2B6]" />
          <span className="absolute end-24 top-24 h-16 w-10 -rotate-12 rounded-[0_100%_0_100%] bg-[#D6E2B6]" />
          <span className="absolute end-10 top-36 h-14 w-9 rotate-45 rounded-[100%_0_100%_0] bg-[#D6E2B6]" />
        </div>

        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.65fr_1.35fr] md:items-start lg:gap-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#617A55]/70">
              MY STORY
            </p>
            <h2 className="mt-3 font-serif text-4xl text-[#25311f] sm:text-5xl">
              {t.about.myStoryHeading}
            </h2>
            <span className="mt-5 block h-px w-16 bg-[#617A55]/35" />
          </div>
          <div className="max-w-3xl space-y-5 text-base leading-8 text-[#4f5d49] sm:text-lg">
            <p>{t.about.myStoryParagraph1}</p>
            <p>{t.about.myStoryParagraph2}</p>
          </div>
        </div>
      </section>

      <section className="bg-[#D6E2B6]/40 px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
        <figure className="mx-auto max-w-4xl text-center">
          <span aria-hidden="true" className="font-serif text-6xl leading-none text-[#617A55]/45">
            &ldquo;
          </span>
          <blockquote className="mt-2 font-serif text-3xl leading-relaxed text-[#25311f] sm:text-4xl">
            {t.about.quoteLine1}
            <br />
            {t.about.quoteLine2}
          </blockquote>
          <figcaption className="mt-6 text-sm font-semibold text-[#617A55]">
            {t.about.quoteAuthor}
          </figcaption>
        </figure>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#617A55]/70">
              WHAT I OFFER
            </p>
            <h2 className="mt-3 font-serif text-4xl text-[#25311f] sm:text-5xl">
              {t.about.offerHeading}
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {services.map((service) => (
              <article
                key={service.title}
                className="rounded-lg border border-[#617A55]/15 bg-[#F7F6F0] p-7 transition-transform duration-200 hover:-translate-y-1 hover:border-[#617A55]/30 sm:p-8"
              >
                <ServiceIcon>{service.icon}</ServiceIcon>
                <h3 className="mt-6 font-serif text-2xl text-[#25311f]">
                  {service.title}
                </h3>
                <p className="mt-3 leading-7 text-[#4f5d49]">
                  {service.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 text-center sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-serif text-4xl leading-tight text-[#25311f] sm:text-5xl">
            {t.about.finalHeading}
          </h2>
          <p className="mt-4 text-base leading-8 text-[#4f5d49] sm:text-lg">
            {t.about.finalParagraph}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/classes"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#617A55] px-7 py-3 text-sm font-semibold text-[#F7F6F0] transition-colors hover:bg-[#617A55]/90"
            >
              {t.about.ctaExplore}
            </Link>
            <Link
              href="/classes"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#617A55]/35 px-7 py-3 text-sm font-semibold text-[#617A55] transition-colors hover:bg-[#D6E2B6]/45"
            >
              {t.about.ctaBookNow}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

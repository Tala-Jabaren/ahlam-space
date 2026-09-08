import Link from 'next/link'

export default function HomePage() {
  return (
    <div>
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:py-24">
        <div className="space-y-8">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#617A55]">
            Ramallah yoga, fitness, and dance studio
          </p>
          <div className="space-y-5">
            <h1 className="max-w-4xl font-serif text-5xl leading-tight text-[#25311f] sm:text-6xl lg:text-7xl">
              Ahlam Space
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[#4f5d49] sm:text-xl">
              A calm studio for movement, breath, and small rituals that make
              the week feel softer. Book classes, explore private sessions, and
              shop studio favorites in one warm place.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/classes"
              className="rounded-full bg-[#617A55] px-7 py-3 text-center text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[#4f6645]"
            >
              View Classes
            </Link>
            <Link
              href="/shop"
              className="rounded-full border border-[#617A55]/30 px-7 py-3 text-center text-sm font-semibold uppercase tracking-[0.16em] text-[#617A55] transition hover:bg-[#D6E2B6]"
            >
              Shop
            </Link>
          </div>
        </div>
        <div className="relative min-h-[360px] overflow-hidden rounded-[2rem] bg-[#C7D6E8] p-6 sm:min-h-[480px]">
          <div className="absolute inset-x-8 top-8 h-40 rounded-[2rem] bg-[#F7F6F0]/70" />
          <div className="absolute bottom-8 left-8 right-20 h-56 rounded-[2rem] bg-[#D6E2B6]" />
          <div className="absolute bottom-20 right-8 h-36 w-36 rounded-full bg-[#617A55]/80" />
          <div className="relative flex h-full min-h-[312px] items-end">
            <p className="max-w-xs rounded-[1.5rem] bg-[#F7F6F0]/85 p-5 text-sm leading-7 text-[#4f5d49] shadow-sm">
              Soft placeholder for studio imagery: mats, candles, movement, and
              the quiet texture of Ahlam Space.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#D6E2B6]/45 px-5 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
          {[
            ['Move', 'Yoga, fitness, and dance classes for different rhythms.'],
            [
              'Breathe',
              'Private sessions and guided practices for steadier days.',
            ],
            ['Gather', 'A warm local space in the heart of Ramallah.'],
          ].map(([title, copy]) => (
            <article
              key={title}
              className="rounded-[1.75rem] border border-[#617A55]/10 bg-[#F7F6F0] p-7"
            >
              <h2 className="font-serif text-3xl text-[#617A55]">{title}</h2>
              <p className="mt-4 leading-7 text-[#4f5d49]">{copy}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

import Link from 'next/link'
import { User, Mic, Users, Leaf } from 'lucide-react'
import SectionHeader from './section-header'

export type ServiceItem = {
  title: string
  description: string
  href: string
}

const icons = [User, Mic, Users, Leaf]

// Card 01 (private sessions) through 04 (shop) each get their own fixed
// palette slot, same order as the design - not generated from index
// parity, since the four colours are a specific, intentional sequence.
// Card 02 is the one exception to the sage palette (--baby-blue), the
// rest stay sage/beige.
const cardVariants = [
  { bg: 'bg-[#E4ECD6]', text: 'text-[#34472B]', iconBg: 'bg-white', iconText: 'text-[#55684A]' },
  { bg: 'bg-[var(--baby-blue)]', text: 'text-[var(--baby-blue-deep)]', iconBg: 'bg-white', iconText: 'text-[var(--baby-blue-deep)]' },
  { bg: 'bg-[#55684A]', text: 'text-[#F6F5EE]', iconBg: 'bg-white/[0.18]', iconText: 'text-white' },
  { bg: 'bg-[#EFE6D2]', text: 'text-[#34472B]', iconBg: 'bg-white', iconText: 'text-[#55684A]' },
]

// No panel, no glass - four cards directly on the page background,
// staggered vertically on desktop (cards 01/03 sit ~36px higher than
// 02/04, done via margin so it never fights the hover lift or the
// scroll-reveal animation, both of which also move the card but via
// different CSS properties - margin, transform and native `translate`
// all compose independently instead of overwriting each other).
export default function ServicesSection({ services, heading }: { services: ServiceItem[]; heading: string }) {
  return (
    <section id="services" className="scroll-mt-24 px-5 py-16 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <SectionHeader heading={heading} />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 md:grid-cols-4">
          {services.map((service, index) => {
            const variant = cardVariants[index]
            const Icon = icons[index]
            return (
              <Link
                key={service.title}
                href={service.href}
                className={`scroll-reveal group rounded-[2rem] p-8 shadow-[0_12px_32px_rgba(52,71,43,0.10)] transition hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55684A] ${variant.bg} ${variant.text} ${
                  index % 2 === 0 ? 'md:-mt-9' : ''
                }`}
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <div className="flex items-start justify-between">
                  <span className="text-xs font-semibold tracking-[0.15em] opacity-60">{String(index + 1).padStart(2, '0')}</span>
                  <span className={`grid size-11 shrink-0 place-items-center rounded-full ${variant.iconBg} ${variant.iconText}`}>
                    <Icon aria-hidden="true" className="size-5" strokeWidth={1.5} />
                  </span>
                </div>
                <h2 className="mt-6 font-serif text-xl">{service.title}</h2>
                <p className="mt-2 text-sm leading-6 opacity-80">{service.description}</p>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

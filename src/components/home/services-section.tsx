import Link from 'next/link'
import type { ReactNode } from 'react'

export type ServiceItem = {
  title: string
  description: string
  href: string
}

const serviceIcons: ReactNode[] = [
  (
    <>
      <circle cx="12" cy="5" r="2.5" />
      <path d="M12 8v5M8 21l4-8 4 8M5 14l7-2 7 2" />
    </>
  ),
  (
    <>
      <path d="M6 8h12l1 13H5L6 8Z" />
      <path d="M9 9V6a3 3 0 0 1 6 0v3" />
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
      <path d="M12 22c4-4 7-7.5 7-12a7 7 0 0 0-14 0c0 4.5 3 8 7 12Z" />
      <path d="M12 22V10M8 14c2.5 0 4 1.5 4 4M16 14c-2.5 0-4 1.5-4 4" />
    </>
  ),
]

// Card 01 (private sessions) through 04 (shop) each get their own fixed
// palette slot, same order and count as the design - not generated from
// index parity, since the four colors/numbers are a specific, intentional
// sequence, not an alternating pattern that would still make sense with a
// different number of cards.
const cardVariants = [
  { bg: 'bg-[#E4ECD6]', text: 'text-[#34472B]', iconBg: 'bg-white/70', number: '01' },
  { bg: 'bg-white', text: 'text-[#34472B]', iconBg: 'bg-[#EFE6D2]', number: '02' },
  { bg: 'bg-[#55684A]', text: 'text-white', iconBg: 'bg-white/15', number: '03' },
  { bg: 'bg-[#EFE6D2]', text: 'text-[#34472B]', iconBg: 'bg-white/70', number: '04' },
]

function ServiceIcon({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span className={`grid size-11 place-items-center rounded-full ${className}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </span>
  )
}

// Pulled up to overlap the hero's bottom edge (negative margin matches the
// hero's own bottom padding) - a scroll-reveal section, not a "below the
// fold" one, so it's the first thing visible as the hero's padding ends.
export default function ServicesSection({ services }: { services: ServiceItem[] }) {
  return (
    <section id="services" className="relative z-10 -mt-20 scroll-mt-24 px-5 sm:px-8 lg:-mt-24 lg:px-10">
      <div className="scroll-reveal mx-auto grid max-w-7xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {services.map((service, index) => {
          const variant = cardVariants[index]
          return (
            <Link
              key={service.title}
              href={service.href}
              className={`group rounded-2xl p-6 shadow-[0_8px_24px_rgba(52,71,43,0.08)] transition hover:-translate-y-1 ${variant.bg} ${variant.text}`}
            >
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold opacity-60">{variant.number}</span>
                <ServiceIcon className={variant.iconBg}>{serviceIcons[index]}</ServiceIcon>
              </div>
              <h2 className="mt-5 font-serif text-xl">{service.title}</h2>
              <p className={`mt-2 text-sm leading-6 ${variant.text === 'text-white' ? 'text-white/85' : 'opacity-75'}`}>
                {service.description}
              </p>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

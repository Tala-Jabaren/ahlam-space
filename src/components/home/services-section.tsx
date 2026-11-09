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

function ServiceIcon({ children }: { children: ReactNode }) {
  return (
    <span className="grid size-11 place-items-center rounded-full bg-[#E4ECD6] text-[#55684A]">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </span>
  )
}

// No longer overlaps the hero (the hero is now a full-bleed photo with
// its own text on top, not a two-column layout this could tuck under) -
// it simply opens the services panel as its own section. Cards sit on one
// big rounded sage panel and start as translucent glass, turning solid
// white with a per-card stagger as the panel crosses into view
// (.panel-card in globals.css) - static solid white outside
// @supports/reduced-motion, so the cards are always readable against the
// panel regardless.
export default function ServicesSection({ services }: { services: ServiceItem[] }) {
  return (
    <section id="services" className="scroll-mt-24 px-5 py-10 sm:px-8 lg:px-10">
      <div className="scroll-reveal mx-auto max-w-7xl rounded-[2.5rem] bg-gradient-to-br from-[#55684A] to-[#34472B] p-5 shadow-[0_16px_40px_rgba(52,71,43,0.18)] sm:p-8 lg:p-10">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service, index) => (
            <Link
              key={service.title}
              href={service.href}
              className="panel-card group rounded-2xl p-6 text-[#34472B] backdrop-blur transition hover:-translate-y-1"
              style={{ '--stagger': `${index * 90}ms` } as React.CSSProperties}
            >
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold text-[#34472B]/50">{String(index + 1).padStart(2, '0')}</span>
                <ServiceIcon>{serviceIcons[index]}</ServiceIcon>
              </div>
              <h2 className="mt-5 font-serif text-xl">{service.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#34472B]/75">{service.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

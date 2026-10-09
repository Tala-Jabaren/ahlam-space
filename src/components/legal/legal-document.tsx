import Link from 'next/link'

export function LegalDocument({
  title,
  introduction,
  children,
}: {
  title: string
  introduction: string
  children: React.ReactNode
}) {
  return (
    <article>
      <header className="border-b border-[#617A55]/20 pb-7">
        <p className="text-sm font-medium text-[#617A55]">مساحة أحلام</p>
        <h1 className="mt-3 text-3xl font-semibold leading-normal text-[#617A55] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-base leading-8 text-[#617A55]">{introduction}</p>
      </header>
      <div className="mt-8 space-y-8">{children}</div>
      <footer className="mt-10 border-t border-[#617A55]/20 pt-6 text-sm leading-7 text-[#617A55]">
        للاستفسار، راسلينا على{' '}
        <Link
          href="mailto:nmi.ahlam@gmail.com"
          dir="ltr"
          className="inline-block break-all underline decoration-[#617A55]/40 underline-offset-4 hover:decoration-[#617A55] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#617A55]"
        >
          nmi.ahlam@gmail.com
        </Link>
        .
      </footer>
    </article>
  )
}

export function LegalSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold leading-8 text-[#617A55]">
        {title}
      </h2>
      <div className="space-y-3 text-base leading-8 text-[#617A55]">{children}</div>
    </section>
  )
}

import Link from 'next/link'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#F7F6F0] text-[#25311f]">
      <nav className="sticky top-0 z-50 mx-auto flex max-w-7xl flex-col gap-5 border-b border-[#617A55]/15 bg-[#F7F6F0]/90 px-5 py-5 backdrop-blur sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <Link
          href="/"
          className="font-serif text-2xl tracking-wide text-[#617A55]"
        >
          Ahlam Space
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-medium uppercase tracking-[0.18em] text-[#617A55]">
            <Link className="transition hover:text-[#25311f]" href="/">
              Home
            </Link>
            <Link className="transition hover:text-[#25311f]" href="/about">
              About
            </Link>
            <Link className="transition hover:text-[#25311f]" href="/classes">
              Classes
            </Link>
            <Link className="transition hover:text-[#25311f]" href="/courses">
              كورسات ومحاضرات
            </Link>
            <Link
              className="transition hover:text-[#25311f]"
              href="/private-sessions"
            >
              جلسات فردية
            </Link>
            <Link className="transition hover:text-[#25311f]" href="/shop">
              Shop
            </Link>
            <Link className="transition hover:text-[#25311f]" href="/contact">
              Contact
            </Link>
          </div>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#617A55] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4f6645]"
            href="/login"
          >
            تسجيل الدخول
          </Link>
        </div>
      </nav>
      <main>{children}</main>
      <footer className="border-t border-[#617A55]/15 px-5 py-10 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm text-[#617A55] sm:flex-row sm:items-center sm:justify-between">
          <p>Ahlam Space, Ramallah</p>
          <p>Yoga, fitness, dance, and mindful daily rituals.</p>
        </div>
      </footer>
    </div>
  )
}

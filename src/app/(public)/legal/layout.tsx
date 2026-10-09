import Link from 'next/link'

const pages = [
  { href: '/legal/terms', label: 'شروط الاستخدام' },
  { href: '/legal/privacy', label: 'سياسة الخصوصية' },
  { href: '/legal/cancellation', label: 'الإلغاء والاسترجاع' },
  { href: '/legal/delivery', label: 'التوصيل والدفع' },
]

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#F7F6F0] px-5 py-10 sm:px-8 sm:py-14" dir="rtl">
      <div className="mx-auto max-w-3xl">
        <nav
          aria-label="السياسات والشروط"
          className="mb-8 flex flex-wrap gap-x-5 gap-y-2 border-b border-[#617A55]/15 pb-5 text-sm text-[#617A55]"
        >
          {pages.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="inline-flex min-h-11 items-center underline decoration-[#D6E2B6] underline-offset-4 transition hover:decoration-[#617A55] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#617A55]"
            >
              {page.label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </div>
  )
}

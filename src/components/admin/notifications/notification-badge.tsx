import type { Locale } from '@/i18n/config'

export default function NotificationBadge({ count, locale = 'ar' }: { count: number; locale?: Locale }) {
  if (count <= 0) return null
  const formatted = new Intl.NumberFormat(locale).format(count)
  return <span className="inline-flex min-h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#B42318] px-1.5 text-xs font-bold leading-5 text-white" aria-label={locale === 'ar' ? `${formatted} إشعارات جديدة` : `${formatted} new notifications`}>
    <span aria-hidden="true">{count > 99 ? '99+' : formatted}</span>
  </span>
}

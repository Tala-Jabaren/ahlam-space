'use client'

import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { markAdminNotificationSeen } from '@/app/(admin)/admin/notification-actions'
import type { AdminNotificationKind } from '@/lib/admin-notification-links'

// Rendering a list never marks its rows seen. Only an explicit open (or an
// item-specific deep link) invokes the action, for exactly this kind + ref_id.
export default function NotificationItem({ kind, id, title, preview, status, initiallyOpen = false, enabled, children }: {
  kind: AdminNotificationKind; id: string; title: string; preview?: string; status?: string
  initiallyOpen?: boolean; enabled: boolean; children: ReactNode
}) {
  const [open, setOpen] = useState(initiallyOpen)
  const [failed, setFailed] = useState(false)
  const [pending, startTransition] = useTransition()
  const attempted = useRef(false)
  const summary = useRef<HTMLElement>(null)
  useEffect(() => {
    if (initiallyOpen) {
      summary.current?.scrollIntoView({ block: 'center' })
      summary.current?.focus({ preventScroll: true })
    }
  }, [initiallyOpen])
  useEffect(() => {
    if (!open || !enabled || attempted.current) return
    attempted.current = true
    startTransition(async () => {
      try {
        const ok = await markAdminNotificationSeen(kind, id)
        setFailed(!ok)
      } catch {
        setFailed(true)
      }
    })
  }, [open, enabled, kind, id])
  return <details id={`notification-${kind}-${id}`} open={open} onToggle={event => { setOpen(event.currentTarget.open); if (!event.currentTarget.open) attempted.current = false }} className="group min-w-0 rounded-xl border border-[#617A55]/15 bg-white open:shadow-sm">
    <summary ref={summary} className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-xl p-4 text-start text-[#617A55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55] [&::-webkit-details-marker]:hidden">
      <span className="min-w-0"><span className="block break-words text-base font-semibold">{title}</span>{preview && <span className="mt-1 block break-words text-sm font-normal text-[#617A55]/80">{preview}</span>}{status && <span className="mt-2 inline-flex rounded-full bg-[#C7D6E8]/45 px-2.5 py-1 text-xs font-medium text-[#25311f]">{status}</span>}</span>
      <span className="flex shrink-0 items-center gap-2 text-sm"><span>{open ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}</span><ChevronDown size={18} aria-hidden="true" className="transition-transform group-open:rotate-180 motion-reduce:transition-none" /></span>
    </summary>
    <div className="min-w-0 border-t border-[#617A55]/10 p-3 sm:p-4">{children}</div>
    {pending && <p role="status" className="px-4 pb-3 text-xs text-[#617A55]">جارٍ تحديث الإشعار…</p>}
    {failed && <p role="status" className="px-4 pb-3 text-sm text-[#617A55]">تعذر تحديث الإشعار، لكن يمكنك متابعة العمل. أغلقي التفاصيل وافتحيها مجددًا للمحاولة.</p>}
  </details>
}

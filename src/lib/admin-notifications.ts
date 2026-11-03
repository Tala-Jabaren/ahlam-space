import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { formatSessionDate, formatSessionTime } from './email/class-reminder-email'
import type { OwnerDigestEvent } from './email/owner-digest-email'

export type NotificationQueueRow = {
  id: string
  kind: 'booking' | 'session_request' | 'order' | 'course_purchase' | 'trip_application'
  ref_id: string
}

type OrderItemRow = {
  quantity: number
  product_variants: { products: { name: string } | null } | null
}

// Loads the full event details a single admin_notification_queue row points
// to, by kind + ref_id, using the service-role client (RLS doesn't apply).
// Returns null when the event shouldn't be reported at all: the ref_id row
// is gone (e.g. a deleted order or booking), or (bookings only, per the
// brief) the booking has since been cancelled. The caller (the cron route)
// must treat a null result as "stays marked sent, never released" - there's
// nothing to retry for a deleted or cancelled record, so it just won't get
// a card in the digest.
export async function loadNotificationEvent(
  supabase: SupabaseClient,
  row: NotificationQueueRow
): Promise<OwnerDigestEvent | null> {
  if (row.kind === 'booking') {
    const { data: booking } = await supabase
      .from('bookings')
      .select('user_id, status, reference, session_id')
      .eq('id', row.ref_id)
      .maybeSingle()
    if (!booking || booking.status === 'cancelled') return null

    const { data: session } = await supabase
      .from('class_sessions')
      .select('session_date, start_time, class_id')
      .eq('id', booking.session_id)
      .maybeSingle()

    const klass = session
      ? (
          await supabase
            .from('classes')
            .select('name, price')
            .eq('id', session.class_id)
            .maybeSingle()
        ).data
      : null

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', booking.user_id)
      .maybeSingle()

    const sessionLabel = session
      ? `${formatSessionDate(session.session_date)} - ${formatSessionTime(session.start_time)}`
      : 'غير متوفر'

    return {
      kind: 'booking',
      customerName: profile?.full_name ?? null,
      customerPhone: profile?.phone ?? null,
      details: `${klass?.name ?? 'حصة'} - ${sessionLabel}`,
      amount: klass?.price ?? null,
      reference: booking.reference,
      status: booking.status,
    }
  }

  if (row.kind === 'session_request') {
    const { data: request } = await supabase
      .from('session_requests')
      .select('full_name, phone, session_type, status')
      .eq('id', row.ref_id)
      .maybeSingle()
    if (!request) return null

    return {
      kind: 'session_request',
      customerName: request.full_name,
      customerPhone: request.phone,
      details: request.session_type,
      amount: null,
      reference: null,
      status: request.status,
    }
  }

  if (row.kind === 'order') {
    const { data: order } = await supabase
      .from('orders')
      .select('user_id, status, total, reference, guest_name, guest_phone')
      .eq('id', row.ref_id)
      .maybeSingle()
    if (!order) return null

    let customerName = order.guest_name
    let customerPhone = order.guest_phone
    if (order.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', order.user_id)
        .maybeSingle()
      customerName = profile?.full_name ?? null
      customerPhone = profile?.phone ?? null
    }

    const { data: items } = await supabase
      .from('order_items')
      .select('quantity, product_variants(products(name))')
      .eq('order_id', row.ref_id)
      .returns<OrderItemRow[]>()

    const details =
      (items ?? [])
        .map((item) => `${item.product_variants?.products?.name ?? 'منتج'} ×${item.quantity}`)
        .join('، ') || 'لا توجد منتجات'

    return {
      kind: 'order',
      customerName,
      customerPhone,
      details,
      amount: order.total,
      reference: order.reference,
      status: order.status,
    }
  }

  if (row.kind === 'course_purchase') {
    const { data: purchase } = await supabase
      .from('course_purchases')
      .select('user_id, status, reference, course_id')
      .eq('id', row.ref_id)
      .maybeSingle()
    if (!purchase) return null

    const { data: course } = await supabase
      .from('courses')
      .select('title, price')
      .eq('id', purchase.course_id)
      .maybeSingle()

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', purchase.user_id)
      .maybeSingle()

    return {
      kind: 'course_purchase',
      customerName: profile?.full_name ?? null,
      customerPhone: profile?.phone ?? null,
      details: course?.title ?? 'محاضرة',
      amount: course?.price ?? null,
      reference: purchase.reference,
      status: purchase.status,
    }
  }

  // trip_application - deliberately loads ONLY the trip title and the
  // applicant's own name/phone from trip_applications itself (never a
  // profiles lookup, since the application already carries its own
  // contact fields). Every health/comfort answer
  // (intention/attended_details/the boolean fields) is explicitly left
  // out of this object - OwnerDigestEvent has no field for them at all,
  // so there's no risk of one slipping into an email body by accident.
  const { data: application } = await supabase
    .from('trip_applications')
    .select('trip_id, full_name, phone, status')
    .eq('id', row.ref_id)
    .maybeSingle()
  if (!application) return null

  const { data: trip } = await supabase
    .from('trips')
    .select('title')
    .eq('id', application.trip_id)
    .maybeSingle()

  return {
    kind: 'trip_application',
    customerName: application.full_name,
    customerPhone: application.phone,
    details: trip?.title ?? 'مشوار',
    amount: null,
    reference: null,
    status: application.status,
  }
}

export type ClassSession = {
  id: string
  session_date: string
  start_time: string
  end_time: string
  capacity: number
  booked_count: number
  status: string
  location: string | null
  classes: { id?: string; name: string; category: string | null; price: number | null; image_url?: string | null } | null
}

export type ClassBooking = {
  id: string
  session_id: string
  status: string
  payment_status: string
  reserved_until: string | null
  // Set when this booking was paid for with a package credit - drives the
  // cancellation messaging/balance-return behavior in BookingCancelControl.
  package_purchase_id?: string | null
}

export type ClassCardData = {
  id: string
  name: string | null
  category: string | null
  image: string | null
  price: number | null
  priceLabel: string | null
  dateLabel: string
  timeLabel: string
  startsAt: string | null
  remaining: number
  isFuture: boolean
  canCancel: boolean
  booking: ClassBooking | null
  bookingStatusKnown: boolean
  authenticated: boolean
  requested: boolean
  // undefined unless the page explicitly opted in (PACKAGES_ENABLED) - see
  // src/lib/class-cards.ts.
  packageEligible?: boolean | null
  // undefined unless the page explicitly opted in - her active package's
  // credit, if any, regardless of whether THIS class accepts it (that's
  // packageEligible's job). Only /classes passes this (see its page.tsx).
  packageCredit?: { purchaseId: string; remaining: number; total: number } | null
}

export type BookingReceipt = {
  id: string
  reference: string | null
  // Set only when this booking was paid for with a package credit -
  // carries the balance after this booking so the success dialog can
  // show it instead of bank-transfer instructions.
  packageBalance?: { remaining: number; total: number } | null
}

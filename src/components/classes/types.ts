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
}

export type BookingReceipt = { id: string; reference: string | null }

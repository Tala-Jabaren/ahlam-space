import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export type CustomerRow = {
  user_id: string
  full_name: string | null
  email: string | null
  phone: string | null
  city: string | null
  registered_at: string
  orders_count: number
  total_spent: number
  last_order_at: string | null
}
export type GuestBuyerRow = {
  guest_name: string | null
  guest_phone: string | null
  guest_email: string | null
  orders_count: number
  total_spent: number
  last_order_at: string | null
}
export type CustomerTab = 'users' | 'guests'
export type CustomerSort = 'registered_desc' | 'registered_asc' | 'spent_desc'
export type CustomerQuery = {
  tab?: CustomerTab
  q?: string
  sort?: CustomerSort
  page?: number
  pageSize?: number
}

export type CustomerOrderItem = {
  product_name: string
  variant_label: string | null
  quantity: number
  unit_price: number
}
export type CustomerOrder = {
  id: string
  reference: string | null
  created_at: string
  status: string
  payment_method: string | null
  fulfillment_method: string | null
  total: number
  delivery_address: string | null
  items: CustomerOrderItem[]
}
export type CustomerBooking = {
  id: string
  reference: string | null
  created_at: string
  status: string
  payment_status: string
  class_name: string
  session_date: string
  start_time: string
  end_time: string
}
export type CustomerCoursePurchase = {
  id: string
  reference: string | null
  created_at: string
  status: string
  paid_at: string | null
  course_title: string
  price: number
}
export type CustomerDetail = {
  profile: CustomerRow
  orders: CustomerOrder[]
  bookings: CustomerBooking[]
  course_purchases: CustomerCoursePurchase[]
}
export type GuestDetail = { guest: GuestBuyerRow; orders: CustomerOrder[] }

// Fictional fixtures only. This module never reads or writes customer data.
const names = ['ليان', 'نور', 'سارة', 'تالا', 'مريم', 'ريم']
const users: CustomerRow[] = Array.from({ length: 27 }, (_, index) => ({
  user_id: `mock-user-${index + 1}`,
  full_name: index === 26 ? null : `${names[index % names.length]} تجريبية ${index + 1}`,
  email: index % 5 === 0 ? null : `member${index + 1}@example.test`,
  phone: index % 4 === 0 ? null : `05000000${String(index).padStart(2, '0')}`,
  city: index % 3 === 0 ? null : ['رام الله', 'القدس', 'حيفا'][index % 3],
  registered_at: new Date(Date.UTC(2026, 8, index + 1, 22)).toISOString(),
  orders_count: index % 7,
  total_spent: (index % 7) * 125.5,
  last_order_at: index % 7 === 0 ? null : new Date(Date.UTC(2026, 9, (index % 18) + 1, 22)).toISOString(),
}))
const guests: GuestBuyerRow[] = Array.from({ length: 23 }, (_, index) => ({
  guest_name: `${names[index % names.length]} زبونة تجريبية ${index + 1}`,
  guest_phone: `05900000${String(index).padStart(2, '0')}`,
  guest_email: index % 2 === 0 ? null : `guest${index + 1}@example.test`,
  orders_count: (index % 4) + 1,
  total_spent: ((index % 4) + 1) * 80.25,
  last_order_at: new Date(Date.UTC(2026, 9, index + 1, 22)).toISOString(),
}))

function selectRows<T extends CustomerRow | GuestBuyerRow>(rows: T[], query: CustomerQuery) {
  const q = (query.q ?? '').trim().toLocaleLowerCase('ar')
  const filtered = rows.filter((row) => {
    const values = 'user_id' in row
      ? [row.full_name, row.email, row.phone]
      : [row.guest_name, row.guest_email, row.guest_phone]
    return values.some((value) => value?.toLocaleLowerCase('ar').includes(q)) || !q
  })
  filtered.sort((a, b) => {
    if (query.sort === 'spent_desc') return b.total_spent - a.total_spent
    // Guests have no registration timestamp in the contract; sort by last order.
    const dateA = 'user_id' in a ? a.registered_at : a.last_order_at
    const dateB = 'user_id' in b ? b.registered_at : b.last_order_at
    const difference = (dateA ?? '').localeCompare(dateB ?? '')
    return query.sort === 'registered_asc' ? difference : -difference
  })
  const size = query.pageSize ?? 20
  const start = ((query.page ?? 1) - 1) * size
  return { rows: filtered.slice(start, start + size), total: filtered.length }
}

export async function getCustomers(supabase: SupabaseClient, query: CustomerQuery) {
  void supabase
  return selectRows(users, query)
}

export async function getGuestBuyers(supabase: SupabaseClient, query: CustomerQuery) {
  void supabase
  return selectRows(guests, query)
}

function mockOrders(count: number, total: number, key: string): CustomerOrder[] {
  return Array.from({ length: count }, (_, index) => {
    const unitPrice = Math.round((total / count) * 100) / 100
    return {
      id: `${key}-order-${index + 1}`,
      reference: index % 2 === 0 ? `DEMO-${key}-${index + 1}` : null,
      created_at: new Date(Date.UTC(2026, 9, 20 - index, 22)).toISOString(),
      status: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'][index % 6],
      payment_method: index % 2 === 0 ? 'bank_transfer' : 'cash_at_studio',
      fulfillment_method: index % 2 === 0 ? 'delivery' : 'pickup',
      total: unitPrice,
      delivery_address: index % 2 === 0 ? 'رام الله، شارع تجريبي' : null,
      items: [{ product_name: 'منتج عناية تجريبي', variant_label: index % 2 === 0 ? 'الحجم الكبير' : null, quantity: 1, unit_price: unitPrice }],
    }
  })
}

export async function getCustomerDetail(supabase: SupabaseClient, userId: string): Promise<CustomerDetail | null> {
  void supabase
  const profile = users.find((user) => user.user_id === userId)
  if (!profile) return null
  const index = users.indexOf(profile)
  return {
    profile,
    orders: mockOrders(profile.orders_count, profile.total_spent, profile.user_id),
    bookings: Array.from({ length: index % 3 }, (_, bookingIndex) => ({
      id: `${userId}-booking-${bookingIndex + 1}`,
      reference: bookingIndex === 0 ? `DEMO-BOOKING-${index + 1}` : null,
      created_at: '2026-10-15T22:30:00Z',
      status: bookingIndex === 0 ? 'confirmed' : 'cancelled',
      payment_status: bookingIndex === 0 ? 'paid' : 'pending',
      class_name: 'حصة يوغا تجريبية',
      session_date: '2026-10-25',
      start_time: '18:00:00',
      end_time: '19:30:00',
    })),
    course_purchases: Array.from({ length: index % 3 }, (_, courseIndex) => ({
      id: `${userId}-course-${courseIndex + 1}`,
      reference: courseIndex === 0 ? `DEMO-COURSE-${index + 1}` : null,
      created_at: '2026-10-12T22:30:00Z',
      status: courseIndex === 0 ? 'paid' : 'pending',
      paid_at: courseIndex === 0 ? '2026-10-13T22:30:00Z' : null,
      course_title: 'محاضرة الحركة والوعي التجريبية',
      price: 100,
    })),
  }
}

export async function getGuestDetail(supabase: SupabaseClient, phone: string): Promise<GuestDetail | null> {
  void supabase
  const guest = guests.find((row) => row.guest_phone === phone)
  if (!guest) return null
  return { guest, orders: mockOrders(guest.orders_count, guest.total_spent, `guest-${phone}`) }
}

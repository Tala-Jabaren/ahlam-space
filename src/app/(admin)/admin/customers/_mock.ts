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

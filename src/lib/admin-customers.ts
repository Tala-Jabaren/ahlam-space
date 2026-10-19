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

const DEFAULT_PAGE_SIZE = 20

function matches(q: string, ...fields: Array<string | null>) {
  const needle = q.trim().toLocaleLowerCase()
  if (!needle) return true
  return fields.some((field) => field?.toLocaleLowerCase().includes(needle))
}

// Shared by both row shapes: "registered_desc"/"registered_asc" sort by
// whichever date each shape actually has (registered_at for users, guests
// have no registration date so last_order_at stands in for it), and
// "spent_desc" is identical for both.
function sortByDate<T>(rows: T[], getDate: (row: T) => string | null, sort: CustomerSort, getSpent: (row: T) => number) {
  const sorted = [...rows]
  if (sort === 'spent_desc') {
    sorted.sort((a, b) => getSpent(b) - getSpent(a))
  } else if (sort === 'registered_asc') {
    sorted.sort((a, b) => (getDate(a) ?? '').localeCompare(getDate(b) ?? ''))
  } else {
    sorted.sort((a, b) => (getDate(b) ?? '').localeCompare(getDate(a) ?? ''))
  }
  return sorted
}

function paginate<T>(rows: T[], page: number, pageSize: number): { rows: T[]; total: number } {
  const total = rows.length
  if (!pageSize) {
    return { rows, total }
  }
  const start = (Math.max(1, page) - 1) * pageSize
  return { rows: rows.slice(start, start + pageSize), total }
}

export async function getCustomers(
  supabase: SupabaseClient,
  query: CustomerQuery = {}
): Promise<{ rows: CustomerRow[]; total: number }> {
  const { q = '', sort = 'registered_desc', page = 1, pageSize = DEFAULT_PAGE_SIZE } = query

  const { data, error } = await supabase.rpc('admin_list_customers')

  if (error) throw error

  // Not using .returns<T[]>() here: with an untyped SupabaseClient (no
  // Database generic - this project's own admin client is untyped the same
  // way, see src/lib/supabase/admin.ts), postgrest-js's .rpc().returns<T[]>()
  // overload resolves to its "single object" error-type branch instead of
  // the array branch. A plain cast after the error check sidesteps that.
  const rows = (data ?? []) as CustomerRow[]

  const filtered = rows.filter((row) =>
    matches(q, row.full_name, row.email, row.phone)
  )
  const sorted = sortByDate(filtered, (row) => row.registered_at, sort, (row) => row.total_spent)

  return paginate(sorted, page, pageSize)
}

export async function getGuestBuyers(
  supabase: SupabaseClient,
  query: CustomerQuery = {}
): Promise<{ rows: GuestBuyerRow[]; total: number }> {
  const { q = '', sort = 'registered_desc', page = 1, pageSize = DEFAULT_PAGE_SIZE } = query

  const { data, error } = await supabase.rpc('admin_list_guest_buyers')

  if (error) throw error

  const rows = (data ?? []) as GuestBuyerRow[]

  const filtered = rows.filter((row) =>
    matches(q, row.guest_name, row.guest_email, row.guest_phone)
  )
  const sorted = sortByDate(filtered, (row) => row.last_order_at, sort, (row) => row.total_spent)

  return paginate(sorted, page, pageSize)
}

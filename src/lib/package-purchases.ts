import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export type PackagePurchaseRow = {
  id: string
  status: string
  reference: string
  price_snapshot: number
  sessions_total: number
  sessions_remaining: number
  payment_method: string | null
  created_at: string | null
  paid_at: string | null
  expires_at: string | null
  class_packages: { name: string; description: string | null } | null
}

export type PackagePurchaseSummary = {
  all: PackagePurchaseRow[]
  active: PackagePurchaseRow | null
  pending: PackagePurchaseRow[]
  closed: PackagePurchaseRow[]
}

function isExpired(purchase: PackagePurchaseRow) {
  return purchase.expires_at ? new Date(purchase.expires_at).getTime() < Date.now() : false
}

// The "one active package" shown in the balance bar / big card - soonest
// expiry first (packages with no expiry sort last, treated as farthest
// away) so a package about to lapse surfaces before one that won't.
function pickActive(candidates: PackagePurchaseRow[]): PackagePurchaseRow | null {
  if (!candidates.length) return null
  return [...candidates].sort((a, b) => {
    const aTime = a.expires_at ? new Date(a.expires_at).getTime() : Infinity
    const bTime = b.expires_at ? new Date(b.expires_at).getTime() : Infinity
    return aTime - bTime
  })[0]
}

export async function loadPackagePurchases(
  supabase: SupabaseClient,
  userId: string,
): Promise<PackagePurchaseSummary> {
  const { data, error } = await supabase
    .from('package_purchases')
    .select('id, status, reference, price_snapshot, sessions_total, sessions_remaining, payment_method, created_at, paid_at, expires_at, class_packages(name, description)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .returns<PackagePurchaseRow[]>()

  if (error) {
    console.error('Failed to load package purchases:', error.message)
    return { all: [], active: null, pending: [], closed: [] }
  }

  const all = data ?? []
  const pending = all.filter(purchase => purchase.status === 'pending')
  const activeCandidates = all.filter(
    purchase => purchase.status === 'paid' && purchase.sessions_remaining > 0 && !isExpired(purchase),
  )
  const active = pickActive(activeCandidates)
  // Only one active purchase gets the big card; the (normally nonexistent)
  // rest fall back into this list rather than vanishing from the UI.
  const closed = all.filter(purchase => purchase !== active && purchase.status !== 'pending')

  return { all, active, pending, closed }
}

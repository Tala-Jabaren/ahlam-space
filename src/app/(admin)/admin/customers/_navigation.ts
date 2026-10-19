export type CustomerSearchParams = Record<string, string | string[] | undefined>

// Carry only known list filters, never an arbitrary return URL.
export function customerListUrl(params: CustomerSearchParams, fallbackTab: 'users' | 'guests') {
  const tab = params.tab === 'users' || params.tab === 'guests' ? params.tab : fallbackTab
  const sort = params.sort === 'registered_asc' || params.sort === 'spent_desc' ? params.sort : 'registered_desc'
  const q = typeof params.q === 'string' ? params.q.trim().slice(0, 200) : ''
  const requestedPage = typeof params.page === 'string' ? Number(params.page) : 1
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  return `/admin/customers?${new URLSearchParams({ tab, q, sort, page: String(page) })}`
}

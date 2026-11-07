// Home page stats strip values. Every entry ships with confirmed: false -
// the owner hasn't signed off on these numbers yet, so the section only
// ever renders entries that are explicitly flipped to true (see
// StatsSection), never a placeholder or an invented figure.
export type SiteStat = {
  label: string
  value: number
  confirmed: boolean
}

export const siteStats: SiteStat[] = [
  { label: 'جلسة فردية أجرتها أحلام', value: 120, confirmed: false },
  { label: 'حصة جماعية قدّمناها', value: 600, confirmed: false },
  { label: 'فعالية ومشوار نظّمناها', value: 40, confirmed: false },
  { label: 'مشاركة رافقتهن أحلام', value: 250, confirmed: false },
]

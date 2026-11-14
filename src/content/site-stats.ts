// Home page stats strip values. StatsSection only ever renders entries
// with confirmed: true, so a label/value never reaches the page until
// someone has actually set it here - flip a line to false (or set its
// value to 0) to pull a single number without touching the others.
export type SiteStat = {
  label: string
  value: number
  confirmed: boolean
}

export const siteStats: SiteStat[] = [
  { label: 'جلسة فردية أجرتها أحلام', value: 120, confirmed: true },
  { label: 'حصة جماعية قدّمناها', value: 600, confirmed: true },
  { label: 'فعالية ومشوار نظّمناها', value: 40, confirmed: false },
  { label: 'مشاركة رافقتهن أحلام', value: 250, confirmed: true },
]

import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'
import { getT } from '@/i18n/get-t'
import { getLocale } from '@/i18n/get-locale'
import { getDictionary } from '@/i18n/dictionaries'
import { pageMetadata } from '@/lib/seo'
import { PACKAGES_ENABLED } from '@/lib/feature-flags'
import ClassesBanner from '@/components/classes/classes-banner'
import ClassesGrid from '@/components/classes/classes-grid'
import PackagesGrid from './packages-grid'
import type { PackageCardData } from './package-card'
import type { ClassSession } from '@/components/classes/types'
import { classCardData, loadClassBookings } from '@/lib/class-cards'
import { getScheduleWindow, groupClassWeeks, isUpcomingSession } from '@/lib/class-schedule-weeks'
import { loadPackagePurchases, type PackagePurchaseSummary } from '@/lib/package-purchases'
import BalanceBar from './balance-bar'
import MyPackagesPanel from './my-packages-panel'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = getDictionary(locale)
  return pageMetadata({ ...t.seo.classes, path: '/classes', locale })
}

type ScheduleRow = ClassSession

export default async function ClassesPage({ searchParams }: {
  searchParams: Promise<{ book?: string; view?: string }>
}) {
  const { book: requestedSessionId, view } = await searchParams
  // While PACKAGES_ENABLED is off, `view` is read but never acted on below -
  // the toggle itself isn't rendered, and the only view ever shown is the
  // existing single-session one, byte-for-byte what this page already did.
  const showPackagesView = PACKAGES_ENABLED && view === 'packages'
  const supabase = await createClient()
  const { t, locale, dir } = await getT()
  const { data: { user } } = await supabase.auth.getUser()
  const [
    { data: classes, error: classesError },
    { data: sessions, error: sessionsError },
  ] = await Promise.all([
    supabase.from('classes').select('*').eq('is_active', true).returns<Tables<'classes'>[]>(),
    supabase.from('class_sessions')
      .select('id, session_date, start_time, end_time, capacity, booked_count, status, location, classes(id, name, category, price)')
      .order('session_date', { ascending: true }).returns<ScheduleRow[]>(),
  ])
  if (classesError) console.error('Failed to load classes:', classesError.message)
  if (sessionsError) console.error('Failed to load class sessions:', sessionsError.message)

  const classesById = new Map((classes ?? []).map(classItem => [classItem.id, classItem]))
  const now = new Date()
  const { localNow, nextWeekStart } = getScheduleWindow(now)
  const upcoming = (sessions ?? []).filter(session => isUpcomingSession(session, localNow))
  const current = await loadClassBookings(supabase, user?.id ?? null, upcoming.map(session => session.id), now, { includePackageInfo: PACKAGES_ENABLED })

  // Computed before `cards` below (not just the balance bar/packages tab
  // further down) so each session card can also offer "book with package"
  // when she has credit - only /classes passes this through to
  // classCardData, matching the same "undefined unless this page opted in"
  // rule packageEligible already uses.
  const packageSummary: PackagePurchaseSummary | null =
    PACKAGES_ENABLED && user ? await loadPackagePurchases(supabase, user.id) : null
  const packageCredit = packageSummary?.active
    ? { purchaseId: packageSummary.active.id, remaining: packageSummary.active.sessions_remaining, total: packageSummary.active.sessions_total }
    : null

  const cards = upcoming
    .map(session => {
      const classInfo = session.classes?.id ? classesById.get(session.classes.id) : undefined
      const card = classCardData(session, locale, {
        now,
        // `classes` came from select('*'), which already tolerates
        // package_eligible not existing in the database yet (see
        // supabase/class-packages.sql's header) - this explicit override
        // just controls whether classCardData (and so the "لا تشمل
        // الباقات" badge) ever sees that field while the flag is off,
        // regardless of what the query happened to return.
        classInfo: classInfo ? { ...classInfo, package_eligible: PACKAGES_ENABLED ? classInfo.package_eligible : undefined } : undefined,
        booking: current.bookings.get(session.id), known: current.known,
        authenticated: Boolean(user), requested: requestedSessionId === session.id,
        packageCredit,
      })
      return { ...card, sessionDate: session.session_date }
    })
    .sort((a, b) => (a.startsAt ?? '').localeCompare(b.startsAt ?? ''))
  const weeks = groupClassWeeks(cards, nextWeekStart, card => card.sessionDate)

  // Packages are only ever fetched when both the flag is on AND this exact
  // view is requested - never on the default/single-session view, and
  // never at all while the flag is off.
  let packages: PackageCardData[] = []
  if (showPackagesView) {
    const { data: packageRows, error: packagesError } = await supabase
      .from('class_packages')
      .select('id, name, description, sessions_count, price, validity_days')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    if (packagesError) console.error('Failed to load class packages:', packagesError.message)
    packages = (packageRows ?? []).map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      sessionsCount: row.sessions_count,
      price: row.price,
      validityDays: row.validity_days,
    }))
  }

  const loginHref = `/login?returnTo=${encodeURIComponent('/classes?view=packages')}`

  return <div dir={dir}>
    <ClassesBanner title={t.classes.heading} tagline={t.classes.tagline} />
    <div className="px-5 py-16 sm:px-8 lg:px-10">
      <section className="mx-auto max-w-7xl">
        {PACKAGES_ENABLED && (
          <nav className="mb-8 inline-flex rounded-[14px] bg-[#ECE7DE] p-1" aria-label={t.classes.viewToggleLabel}>
            <Link
              href="/classes"
              aria-current={!showPackagesView ? 'page' : undefined}
              className={`inline-flex min-h-11 items-center justify-center rounded-[10px] px-5 text-sm font-semibold transition motion-reduce:transition-none ${!showPackagesView ? 'bg-white text-[#25402F]' : 'text-[#5C574F] hover:text-[#25402F]'}`}
            >
              {t.classes.singleSessionView}
            </Link>
            <Link
              href="/classes?view=packages"
              aria-current={showPackagesView ? 'page' : undefined}
              className={`inline-flex min-h-11 items-center justify-center rounded-[10px] px-5 text-sm font-semibold transition motion-reduce:transition-none ${showPackagesView ? 'bg-white text-[#25402F]' : 'text-[#5C574F] hover:text-[#25402F]'}`}
            >
              {t.classes.packagesView}
            </Link>
          </nav>
        )}

        {!showPackagesView && packageSummary?.active && <BalanceBar purchase={packageSummary.active} locale={locale} t={t} />}

        {showPackagesView ? (
          <>
            {packageSummary && <MyPackagesPanel summary={packageSummary} locale={locale} t={t} />}
            <p className="mb-6 text-[15px] leading-7 text-[#5C574F]">{t.classes.packages.introLine}</p>
            <PackagesGrid
              packages={packages}
              locale={locale}
              isLoggedIn={Boolean(user)}
              loginHref={loginHref}
              emptyLabel={t.classes.packages.empty}
              copy={{
                sessionsLabel: t.classes.packages.sessionsLabel,
                perSessionLabel: t.classes.packages.perSessionLabel,
                savings: t.classes.packages.savings,
                validity: t.classes.packages.validity,
                buy: t.classes.packages.buy,
                loginToBuy: t.classes.packages.loginToBuy,
                perSessionPriceLine: t.classes.packages.perSessionPriceLine,
                sessionsFreelyChosen: t.classes.packages.sessionsFreelyChosen,
                validMonthFromConfirm: t.classes.packages.validMonthFromConfirm,
              }}
            />
            <p className="mt-6 text-[14px] leading-6 text-[#5C574F]">{t.classes.packages.footerNote}</p>
          </>
        ) : (
          <div id="sessions-list">
            {!classes || classes.length === 0 ? (
              <div className="rounded-[1.75rem] bg-[#C7D6E8]/55 p-8 text-[#4f5d49]">{t.classes.noClasses}</div>
            ) : (
              <ClassesGrid weeks={weeks} weekLabels={t.classes.weekGroups} allLabel={t.classes.allFilter} filterLabel={t.classes.filterLabel} />
            )}
          </div>
        )}
      </section>
    </div>
  </div>
}

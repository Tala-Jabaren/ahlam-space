import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'
import { getT } from '@/i18n/get-t'
import { I18nProvider } from '@/i18n/i18n-context'
import ClassWeekSections from '@/components/classes/class-week-sections'
import ClassesBanner from '@/components/classes/classes-banner'
import type { ClassSession } from '@/components/classes/types'
import { classCardData, loadClassBookings } from '@/lib/class-cards'
import { getScheduleWindow, groupClassWeeks, sessionsInWindow } from '@/lib/class-schedule-weeks'
import { PACKAGES_ENABLED } from '@/lib/feature-flags'
import { loadPackagePurchases, type PackagePurchaseSummary } from '@/lib/package-purchases'
import PackagesGrid from './packages-grid'
import type { PackageCardData } from './package-card'
import ActivePackageCard from './active-package-card'
import MyPackagesPanel from './my-packages-panel'

type ScheduleRow = ClassSession

export default async function MemberSchedulePage({ searchParams }: {
  searchParams: Promise<{ book?: string; view?: string }>
}) {
  const { book: requestedSessionId, view } = await searchParams
  // While PACKAGES_ENABLED is off, `view` is read but never acted on below -
  // the toggle itself isn't rendered, and the only view ever shown is the
  // existing single-session one, byte-for-byte what this page already did.
  const showPackagesView = PACKAGES_ENABLED && view === 'packages'
  const now = new Date()
  const { window, localNow, nextWeekStart } = getScheduleWindow(now)
  const supabase = await createClient()
  const { t, locale, dir } = await getT()
  const { data: { user } } = await supabase.auth.getUser()
  const [
    { data: classes, error: classesError },
    { data: sessions, error: sessionsError },
  ] = await Promise.all([
    // Only needed for package_eligible (and image_url as a bonus) - the
    // session query below already embeds name/category/price for the
    // plain schedule view. Same "select('*') tolerates a column that
    // might not exist yet" reasoning as /classes used before this moved.
    supabase.from('classes').select('*').eq('is_active', true).returns<Tables<'classes'>[]>(),
    supabase.from('class_sessions')
      .select('id, session_date, start_time, end_time, capacity, booked_count, status, location, classes(id, name, category, price, image_url)')
      .gte('session_date', window.start).lt('session_date', window.end)
      .order('session_date', { ascending: true }).order('start_time', { ascending: true })
      .returns<ScheduleRow[]>(),
  ])
  if (classesError) console.error('Failed to load classes:', classesError.message)
  if (sessionsError) console.error('Failed to load schedule:', sessionsError.message)

  const classesById = new Map((classes ?? []).map(classItem => [classItem.id, classItem]))
  const upcomingSessions = sessionsInWindow(sessions ?? [], window, localNow)
  const current = await loadClassBookings(supabase, user?.id ?? null, upcomingSessions.map(session => session.id), now, { includePackageInfo: PACKAGES_ENABLED })

  // Computed before `weeks` below (not just the balance bar/packages tab
  // further down) so each session card can also offer "book with package"
  // when she has credit.
  const packageSummary: PackagePurchaseSummary | null =
    PACKAGES_ENABLED && user ? await loadPackagePurchases(supabase, user.id) : null
  const packageCredit = packageSummary?.active
    ? { purchaseId: packageSummary.active.id, remaining: packageSummary.active.sessions_remaining, total: packageSummary.active.sessions_total }
    : null

  const weeks = groupClassWeeks(upcomingSessions, nextWeekStart, session => session.session_date).map(({ kind, sessions }) => ({
    kind,
    sessions: sessions.map(session => {
      const classInfo = session.classes?.id ? classesById.get(session.classes.id) : undefined
      return classCardData(session, locale, {
        now,
        classInfo: classInfo ? { ...classInfo, package_eligible: PACKAGES_ENABLED ? classInfo.package_eligible : undefined } : undefined,
        booking: current.bookings.get(session.id), known: current.known,
        authenticated: Boolean(user), requested: requestedSessionId === session.id,
        packageCredit,
      })
    }),
  }))

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

  return <I18nProvider locale={locale} dictionary={t}>
    <div dir={dir}>
      <ClassesBanner />
      <main className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {PACKAGES_ENABLED && (
            <nav className="mb-8 inline-flex rounded-[14px] bg-[#ECE7DE] p-1" aria-label={t.classes.viewToggleLabel}>
              <Link
                href="/member-schedule"
                aria-current={!showPackagesView ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center justify-center rounded-[10px] px-5 text-sm font-semibold transition motion-reduce:transition-none ${!showPackagesView ? 'bg-white text-[#25402F]' : 'text-[#5C574F] hover:text-[#25402F]'}`}
              >
                {t.classes.singleSessionView}
              </Link>
              <Link
                href="/member-schedule?view=packages"
                aria-current={showPackagesView ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center justify-center rounded-[10px] px-5 text-sm font-semibold transition motion-reduce:transition-none ${showPackagesView ? 'bg-white text-[#25402F]' : 'text-[#5C574F] hover:text-[#25402F]'}`}
              >
                {t.classes.packagesView}
              </Link>
            </nav>
          )}

          {!showPackagesView && packageSummary?.active && (
            <div className="mb-6"><ActivePackageCard purchase={packageSummary.active} locale={locale} t={t} /></div>
          )}

          {showPackagesView ? (
            <>
              {packageSummary && <MyPackagesPanel summary={packageSummary} locale={locale} t={t} />}
              <p className="mb-6 text-[15px] leading-7 text-[#5C574F]">{t.classes.packages.introLine}</p>
              <PackagesGrid
                packages={packages}
                locale={locale}
                emptyLabel={t.classes.packages.empty}
                copy={{
                  sessionsLabel: t.classes.packages.sessionsLabel,
                  perSessionLabel: t.classes.packages.perSessionLabel,
                  savings: t.classes.packages.savings,
                  validity: t.classes.packages.validity,
                  buy: t.classes.packages.buy,
                  perSessionPriceLine: t.classes.packages.perSessionPriceLine,
                  sessionsFreelyChosen: t.classes.packages.sessionsFreelyChosen,
                  validMonthFromConfirm: t.classes.packages.validMonthFromConfirm,
                }}
              />
              <p className="mt-6 text-[14px] leading-6 text-[#5C574F]">{t.classes.packages.footerNote}</p>
            </>
          ) : (
            <div id="sessions-list" className="scroll-mt-20">
              {sessionsError ? (
                <div className="rounded-lg bg-[#C7D6E8]/55 p-6">{t.memberSchedule.loadError}</div>
              ) : (
                <ClassWeekSections weeks={weeks} labels={t.classes.weekGroups} />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  </I18nProvider>
}

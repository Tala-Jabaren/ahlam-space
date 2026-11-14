// Verifies the Asia/Hebron time math behind claim_due_class_reminders /
// claim_due_trip_reminders (supabase/notification-emails.sql) WITHOUT a
// database - pure JS, using the same approach Postgres' `at time zone
// 'Asia/Hebron'` takes (interpret a wall-clock date+time AS Asia/Hebron
// local time, convert to an absolute instant, then compare to now()).
//
// This repo has no test runner configured (no vitest/jest, no "test"
// script in package.json) - run this directly instead:
//   node scripts/verify-reminder-time-math.mjs
//
// Exits non-zero if any check fails, so it's also usable in CI later if a
// test runner is ever added.

const REMINDER_HOURS = 12

// Converts a 'YYYY-MM-DD' + 'HH:MM:SS' pair, interpreted as Asia/Hebron
// local wall-clock time, into the equivalent UTC Date - the JS-side
// equivalent of Postgres' `(date + time) at time zone 'Asia/Hebron'`.
// Works by asking Intl what Asia/Hebron's offset is at an initial guess,
// correcting for it, and re-checking once (handles the one case where the
// naive guess crosses a DST boundary).
function hebronWallClockToUtc(dateStr, timeStr) {
  const naiveUtc = new Date(`${dateStr}T${timeStr}Z`)
  const offsetMinutes = (date) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Hebron',
      timeZoneName: 'shortOffset',
    }).formatToParts(date)
    const raw = parts.find((p) => p.type === 'timeZoneName').value // e.g. "GMT+3"
    const match = raw.match(/GMT([+-]\d+)/)
    return match ? Number(match[1]) * 60 : 0
  }
  const firstGuessOffset = offsetMinutes(naiveUtc)
  const corrected = new Date(naiveUtc.getTime() - firstGuessOffset * 60_000)
  const secondOffset = offsetMinutes(corrected)
  return new Date(naiveUtc.getTime() - secondOffset * 60_000)
}

function isDueNow(dateStr, timeStr, nowUtc, hours = REMINDER_HOURS) {
  const target = hebronWallClockToUtc(dateStr, timeStr)
  const windowStart = nowUtc
  const windowEnd = new Date(nowUtc.getTime() + hours * 3_600_000)
  return target > windowStart && target <= windowEnd
}

let failures = 0
function check(label, actual, expected) {
  const pass = actual === expected
  if (!pass) failures += 1
  console.log(`${pass ? 'OK  ' : 'FAIL'} ${label} (got ${actual}, expected ${expected})`)
}

console.log('--- Asia/Hebron vs Asia/Jerusalem divergence (the actual bug this project hit) ---')
{
  // Confirmed in the deploy-final-prep pass: on 2025-10-25, Israel (Asia/
  // Jerusalem) was still in DST (UTC+3) while Palestine (Asia/Hebron) had
  // already fallen back to UTC+2. Using the wrong zone here shifts the
  // reminder window by a full hour during that gap.
  const hebron = hebronWallClockToUtc('2025-10-25', '12:00:00')
  const expectedUtc = new Date('2025-10-25T10:00:00Z') // 12:00 Hebron = 10:00 UTC at +2
  check('2025-10-25 12:00 Hebron -> UTC', hebron.toISOString(), expectedUtc.toISOString())
}

console.log('\n--- Midnight-crossing window (a trip meeting at 00:30, now 11:00 the day before) ---')
{
  // A trip starting 2026-06-02 with meeting_time 00:30 - just after
  // midnight. "now" is 2026-06-01T11:00 UTC (summer, Hebron = UTC+3, so
  // that's 14:00 Hebron on June 1st). The meeting is ~10.5h away - inside
  // the 12h window.
  const now = new Date('2026-06-01T11:00:00Z')
  check(
    'meeting at 00:30 the next day, ~10.5h out, within 12h window',
    isDueNow('2026-06-02', '00:30:00', now),
    true
  )
  // Same meeting time, but "now" is only 2026-06-01T08:00 UTC (~16.5h
  // away) - outside the 12h window.
  const tooEarly = new Date('2026-06-01T08:00:00Z')
  check(
    'same meeting, ~16.5h out, outside 12h window',
    isDueNow('2026-06-02', '00:30:00', tooEarly),
    false
  )
}

console.log('\n--- DST transition inside the reminder window ---')
{
  // Hebron's 2026 DST start is late March (confirmed via the Jerusalem-vs-
  // Hebron check above moving to +2 by 2026-03-25 in the main audit) - a
  // class at 2026-03-27 08:00 Hebron local time, "now" 20h-ish before it,
  // straddles that change. The point isn't the exact boundary date (IANA
  // data can shift), it's that hebronWallClockToUtc re-checks the offset
  // AFTER applying the first guess, so a transition inside the gap between
  // "now" and the target doesn't silently use the wrong side's offset for
  // the target itself.
  const target = hebronWallClockToUtc('2026-03-27', '08:00:00')
  const manualOffsetCheck = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Hebron',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(target)
  check(
    'converting back from the computed UTC instant lands on 2026-03-27, 08:00 Hebron local',
    manualOffsetCheck.includes('03/27/2026') && manualOffsetCheck.includes('08:00'),
    true
  )
}

console.log('\n--- Already-past is never due ---')
{
  const now = new Date('2026-01-10T09:00:00Z')
  check('a session that already started is never due', isDueNow('2026-01-10', '08:00:00', now), false)
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`)
process.exit(failures === 0 ? 0 : 1)

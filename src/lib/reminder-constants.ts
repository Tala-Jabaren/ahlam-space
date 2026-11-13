// Single constant shared by the class-reminder and trip-reminder claim RPCs
// (src/app/api/cron/class-reminders/route.ts) - how many hours before a
// group class or a trip's meeting time its automatic reminder email goes
// out. No quiet hours: the cron runs hourly regardless of time of day, and
// sends as soon as something falls inside this window.
//
// Also set as the default on claim_due_class_reminders/claim_due_trip_
// reminders in supabase/notification-emails.sql, so a manual SQL call
// without an explicit p_hours matches this constant too - but the route
// always passes it explicitly, so the two can never drift apart in
// practice even if someone changes only one of them.
export const REMINDER_HOURS = 12

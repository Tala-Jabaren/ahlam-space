import 'server-only'
import { createHash, timingSafeEqual } from 'node:crypto'

// Shared by both cron routes (src/app/api/cron/*). Fails closed if
// CRON_SECRET is unset/empty - Boolean(secret) short-circuits before ever
// touching the header. Hashing both sides to a fixed-length SHA-256 digest
// before comparing means timingSafeEqual never sees a length mismatch (it
// throws if its two buffers differ in length, which a raw header of
// attacker-controlled length otherwise could), so the whole comparison
// - including its early-exit behavior - runs in time independent of the
// header's length or content, not just once both buffers are equal length.
export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const header = request.headers.get('authorization') ?? ''
  const expected = createHash('sha256').update(`Bearer ${secret}`).digest()
  const actual = createHash('sha256').update(header).digest()
  return timingSafeEqual(expected, actual)
}

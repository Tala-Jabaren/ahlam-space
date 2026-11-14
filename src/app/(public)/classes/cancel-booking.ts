'use server'

export type CancelBookingResult =
  | { ok: true }
  | { ok: false; code: 'NOT_IMPLEMENTED' | 'TOO_LATE' | 'FORBIDDEN' | 'ERROR' }

export async function cancelBooking(bookingId: string): Promise<CancelBookingResult> {
  void bookingId
  // TODO: wire the reviewed secure RPC. It must authenticate ownership and
  // recheck >12h on the server. This stub intentionally performs NO DB calls.
  return { ok: false, code: 'NOT_IMPLEMENTED' }
}

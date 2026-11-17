import { createClient } from '@/lib/supabase/client'

// Carries an upload route's own specific reason (always a concrete Arabic
// string - missing bucket, wrong file format, expired session, no admin
// role, size limit, ...) alongside the generic errorCode used to pick a
// fallback message when the server didn't return one. Throwing a bare
// Error(errorCode) would discard that reason entirely, surfacing the same
// generic message regardless of the actual cause. Shared by every admin
// form that uploads a file (courses, classes, trips, reviews, products).
export class UploadError extends Error {
  serverMessage?: string
  constructor(code: string, serverMessage?: string) {
    super(code)
    this.serverMessage = serverMessage
  }
}

// Only enough of the file to sniff its real format from magic bytes
// (see src/lib/file-format.ts) - every format it checks declares itself
// well within the first 64 bytes.
const HEADER_PROBE_BYTES = 64

// Every admin file upload is two steps, never one: (1) ask our own server
// to check admin auth, validate the owner id, and sniff the file's real
// format from a small header slice, then hand back a short-lived signed
// upload token; (2) send the actual file straight to Supabase Storage with
// that token, bypassing this app's server entirely for the large payload.
//
// This exists because Vercel hard-caps every request body a serverless
// function receives at 4.5MB - not configurable by any Next.js or app
// setting - well under this app's own 60MB audio / 5MB image limits, so
// the real file can never be POSTed to one of our own routes directly.
// The signed token is itself the write authorization (Supabase Storage
// needs no RLS grant to accept it), so this doesn't weaken who can upload -
// the same admin/format checks still gate step 1, just before the byte
// transfer instead of wrapping it.
export async function uploadFileDirect(requestUrl: string, fields: Record<string, string>, file: File, errorCode: string) {
  const body = new FormData()
  for (const [key, value] of Object.entries(fields)) body.append(key, value)
  body.append('header', file.slice(0, HEADER_PROBE_BYTES), 'header')
  body.append('content_type', file.type)
  const response = await fetch(requestUrl, { method: 'POST', body })
  const json = await response.json().catch(() => null)
  if (!response.ok || typeof json?.bucket !== 'string' || typeof json?.path !== 'string' || typeof json?.token !== 'string') {
    throw new UploadError(errorCode, typeof json?.error === 'string' ? json.error : undefined)
  }
  const { bucket, path, token } = json as { bucket: string; path: string; token: string }
  const { error } = await createClient().storage.from(bucket).uploadToSignedUrl(path, token, file, { contentType: file.type })
  if (error) throw new UploadError(errorCode, 'تعذر رفع الملف إلى التخزين مباشرة. تحققي من الاتصال ثم حاولي مجددًا.')
  return { bucket, path }
}

// Public buckets only - the private meditations bucket has no public URL,
// callers there keep using the returned `path` with a signed read URL.
export function publicUrlFor(bucket: string, path: string) {
  return createClient().storage.from(bucket).getPublicUrl(path).data.publicUrl
}

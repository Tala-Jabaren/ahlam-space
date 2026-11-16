// Carries an upload route's own specific reason (always a concrete Arabic
// string - missing bucket, wrong file format, expired session, no admin
// role, size limit, ...) alongside the generic errorCode used to pick a
// fallback message when the server didn't return one. Throwing a bare
// Error(errorCode) would discard that reason entirely, surfacing the same
// generic message regardless of the actual cause. Shared by every admin
// form that uploads a file (courses, classes, ...).
export class UploadError extends Error {
  serverMessage?: string
  constructor(code: string, serverMessage?: string) {
    super(code)
    this.serverMessage = serverMessage
  }
}

export async function uploadFile(url: string, fields: Record<string, string>, fileField: string, file: File, errorCode: string) {
  const body = new FormData()
  for (const [key, value] of Object.entries(fields)) body.append(key, value)
  body.append(fileField, file)
  const response = await fetch(url, { method: 'POST', body })
  const json = await response.json().catch(() => null)
  if (!response.ok || !json) throw new UploadError(errorCode, typeof json?.error === 'string' ? json.error : undefined)
  return json as { url?: string; path?: string }
}

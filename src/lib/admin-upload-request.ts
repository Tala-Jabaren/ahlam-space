import { createClient } from '@/lib/supabase/server'
import { createSignedUpload } from '@/lib/signed-upload'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Format = { type: string; extension: string }

export type SignedUploadMessages = {
  // No session, or not an admin.
  loginAgain: string
  noPermission: string
  // Malformed request body, or a bad/missing owner id (course_id, class_id, ...).
  invalidBody: string
  invalidOwner: string
  // The client-declared size exceeds this route's limit. Advisory only -
  // the real backstop is the bucket's own file_size_limit, since the full
  // file never reaches this server to be measured here.
  tooLarge: string
  // The header-byte probe didn't match a format this route accepts.
  invalidFormat: string
  // createSignedUpload() itself failed (bucket missing, storage down, ...).
  signFailed: string
  generic: string
}

// Shared by every admin upload route: checks admin auth, validates the
// owner id and the file's declared size/real format (sniffed from a small
// header-byte slice the client sends instead of the whole file), then
// hands back a short-lived signed upload token for the client to upload
// the actual file directly to Supabase Storage with. See
// src/lib/admin-upload.ts for why the full file is never sent here.
export async function handleSignedUploadRequest(request: Request, config: {
  ownerField: string
  bucket: string
  pathPrefix: string
  maxBytes: number
  detect: (bytes: Uint8Array) => Format | null
  allowedTypes?: string[]
  // Cross-check the browser-declared File.type against the format sniffed
  // from the header bytes. Reliable for images (browsers consistently
  // report image/jpeg, image/png, image/webp), but browsers frequently
  // report an empty/generic type for audio files like .m4a depending on
  // OS codec registration - the original (pre-direct-upload) audio route
  // never did this cross-check either, only AUDIO_TYPES.includes(...).
  // Defaults to true for image routes; pass false for audio.
  checkDeclaredType?: boolean
  messages: SignedUploadMessages
}): Promise<Response> {
  const { ownerField, bucket, pathPrefix, maxBytes, detect, allowedTypes, checkDeclaredType = true, messages } = config

  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return Response.json({ error: 'طلب غير مسموح.' }, { status: 403 })
  }
  try {
    const client = await createClient()
    const { data: { user }, error: authError } = await client.auth.getUser()
    if (authError || !user) return Response.json({ error: messages.loginAgain }, { status: 401 })
    const { data: profile, error: profileError } = await client.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profileError) return Response.json({ error: 'تعذر التحقق من صلاحيات الإدارة. حاولي مجددًا.' }, { status: 503 })
    if (profile?.role !== 'admin') return Response.json({ error: messages.noPermission }, { status: 403 })
    if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) {
      return Response.json({ error: messages.invalidBody }, { status: 400 })
    }

    let form: FormData
    try {
      form = await request.formData()
    } catch {
      return Response.json({ error: messages.invalidBody }, { status: 400 })
    }

    const ownerId = String(form.get(ownerField) || '')
    if (!UUID_RE.test(ownerId)) return Response.json({ error: messages.invalidOwner }, { status: 400 })

    const size = Number(form.get('size'))
    if (Number.isFinite(size) && size > maxBytes) {
      return Response.json({ error: messages.tooLarge }, { status: 413 })
    }

    const header = form.get('header')
    if (!(header instanceof Blob) || header.size === 0) {
      return Response.json({ error: messages.invalidBody }, { status: 400 })
    }
    const headerBytes = new Uint8Array(await header.arrayBuffer())
    const format = detect(headerBytes)
    const declaredType = String(form.get('content_type') || '')
    if (
      !format ||
      (checkDeclaredType && declaredType !== format.type) ||
      (allowedTypes && !allowedTypes.includes(format.type))
    ) {
      return Response.json({ error: messages.invalidFormat }, { status: 400 })
    }

    const path = `${pathPrefix ? `${pathPrefix}/` : ''}${ownerId}/${crypto.randomUUID()}.${format.extension}`
    const signed = await createSignedUpload(bucket, path)
    if (!signed) return Response.json({ error: messages.signFailed }, { status: 502 })

    // Echoes back the format sniffed from the real magic bytes, not the
    // browser's own (sometimes empty, e.g. for .m4a) declared type - the
    // client uploads with this contentType so the bucket's own
    // allowed_mime_types check (the real backstop now - see
    // supabase/upload-bucket-limits.sql) sees a value that's actually in
    // its list, regardless of what the browser guessed.
    return Response.json({ ...signed, contentType: format.type })
  } catch {
    return Response.json({ error: messages.generic }, { status: 500 })
  }
}

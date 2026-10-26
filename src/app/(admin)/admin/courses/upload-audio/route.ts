import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AUDIO_TYPES, MAX_AUDIO_BYTES, MEDITATIONS_AUDIO_BUCKET } from '@/components/admin/course-input'
import { detectAudioFormat } from '@/lib/file-format'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Uploads straight into the private meditations bucket (created by
// supabase/meditations.sql - must already be applied) and returns the raw
// storage path, not a public URL - the bucket has no public read access,
// playback only ever happens through get_meditation_audio_path() + a
// signed URL after a purchase is confirmed.
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return Response.json({ error: 'طلب غير مسموح.' }, { status: 403 })
  }
  try {
    const client = await createClient()
    const { data: { user }, error: authError } = await client.auth.getUser()
    if (authError || !user) return Response.json({ error: 'سجّلي الدخول مجددًا لإضافة الملف الصوتي.' }, { status: 401 })
    const { data: profile, error: profileError } = await client.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profileError) return Response.json({ error: 'تعذر التحقق من صلاحيات الإدارة. حاولي مجددًا.' }, { status: 503 })
    if (profile?.role !== 'admin') return Response.json({ error: 'ليست لديك صلاحية إضافة الملفات الصوتية.' }, { status: 403 })
    if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) {
      return Response.json({ error: 'بيانات الملف الصوتي غير صالحة.' }, { status: 400 })
    }
    if (Number(request.headers.get('content-length') || 0) > MAX_AUDIO_BYTES + 128 * 1024) {
      return Response.json({ error: 'حجم الملف الصوتي يجب ألا يتجاوز 60 ميغابايت.' }, { status: 413 })
    }

    let form: FormData
    try {
      form = await request.formData()
    } catch {
      return Response.json({ error: 'بيانات الملف الصوتي غير صالحة.' }, { status: 400 })
    }

    const courseId = String(form.get('course_id') || '')
    if (!UUID_RE.test(courseId)) return Response.json({ error: 'معرف الكورس غير صالح.' }, { status: 400 })

    const audio = form.get('audio')
    if (!(audio instanceof File) || audio.size === 0) {
      return Response.json({ error: 'اختاري ملف صوت.' }, { status: 400 })
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      return Response.json({ error: 'حجم الملف الصوتي يجب ألا يتجاوز 60 ميغابايت.' }, { status: 413 })
    }
    const audioBytes = new Uint8Array(await audio.arrayBuffer())
    const format = detectAudioFormat(audioBytes)
    if (!format || !AUDIO_TYPES.includes(format.type)) {
      return Response.json({ error: 'اختاري ملف صوت MP3 أو WAV أو OGG أو M4A صحيحًا.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const path = `${courseId}/${crypto.randomUUID()}.${format.extension}`
    const upload = await admin.storage.from(MEDITATIONS_AUDIO_BUCKET).upload(path, audioBytes, { contentType: format.type, upsert: false })
    if (upload.error) {
      return Response.json({ error: 'تعذر رفع الملف الصوتي. تحققي من الاتصال ومن أن مخزن meditations موجود، ثم حاولي مجددًا.' }, { status: 502 })
    }
    return Response.json({ path })
  } catch {
    return Response.json({ error: 'تعذر رفع الملف الصوتي. حاولي مجددًا.' }, { status: 500 })
  }
}

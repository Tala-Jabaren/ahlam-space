import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MAX_PRODUCT_IMAGE_BYTES, PRODUCT_IMAGE_BUCKET } from '@/components/admin/product-input'
import { detectImageFormat } from '@/lib/file-format'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Reuses the product-images bucket (public, already live) under a reviews/
// prefix, same as course covers reuse it under courses/ - no new bucket or
// storage policy needed. review_id is generated client-side before the
// review row itself exists yet on create (same pattern course/product
// creation already uses), so this upload can happen before the insert.
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return Response.json({ error: 'طلب غير مسموح.' }, { status: 403 })
  }
  try {
    const client = await createClient()
    const { data: { user }, error: authError } = await client.auth.getUser()
    if (authError || !user) return Response.json({ error: 'سجّلي الدخول مجددًا لإضافة الصورة.' }, { status: 401 })
    const { data: profile, error: profileError } = await client.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profileError) return Response.json({ error: 'تعذر التحقق من صلاحيات الإدارة. حاولي مجددًا.' }, { status: 503 })
    if (profile?.role !== 'admin') return Response.json({ error: 'ليست لديك صلاحية إضافة الصور.' }, { status: 403 })
    if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) {
      return Response.json({ error: 'بيانات الصورة غير صالحة.' }, { status: 400 })
    }
    if (Number(request.headers.get('content-length') || 0) > MAX_PRODUCT_IMAGE_BYTES + 128 * 1024) {
      return Response.json({ error: 'حجم الصورة يجب ألا يتجاوز 5 ميغابايت.' }, { status: 413 })
    }

    let form: FormData
    try {
      form = await request.formData()
    } catch {
      return Response.json({ error: 'بيانات الصورة غير صالحة.' }, { status: 400 })
    }

    const reviewId = String(form.get('review_id') || '')
    if (!UUID_RE.test(reviewId)) return Response.json({ error: 'معرف المراجعة غير صالح.' }, { status: 400 })

    const image = form.get('image')
    if (!(image instanceof File) || image.size === 0) {
      return Response.json({ error: 'اختاري صورة.' }, { status: 400 })
    }
    if (image.size > MAX_PRODUCT_IMAGE_BYTES) {
      return Response.json({ error: 'حجم الصورة يجب ألا يتجاوز 5 ميغابايت.' }, { status: 413 })
    }
    const imageBytes = new Uint8Array(await image.arrayBuffer())
    const format = detectImageFormat(imageBytes)
    if (!format || image.type !== format.type) {
      return Response.json({ error: 'اختاري صورة JPG أو PNG أو WebP صحيحة.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const path = `reviews/${reviewId}/${crypto.randomUUID()}.${format.extension}`
    const upload = await admin.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, imageBytes, { contentType: format.type, upsert: false })
    if (upload.error) {
      return Response.json({ error: 'تعذر رفع الصورة. تحققي من الاتصال ومخزن الصور ثم حاولي مجددًا.' }, { status: 502 })
    }
    const url = admin.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl
    return Response.json({ url })
  } catch {
    return Response.json({ error: 'تعذر رفع الصورة. حاولي مجددًا.' }, { status: 500 })
  }
}

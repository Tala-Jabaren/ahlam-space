import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MAX_PRODUCT_IMAGE_BYTES, PRODUCT_IMAGE_BUCKET, productInputSchema } from '@/components/admin/product-input'
import { detectImageFormat } from '@/lib/file-format'

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return Response.json({ error: 'طلب غير مسموح.' }, { status: 403 })
  try {
    const client = await createClient()
    const { data: { user }, error: authError } = await client.auth.getUser()
    if (authError || !user) return Response.json({ error: 'سجّلي الدخول مجددًا لإضافة المنتج.' }, { status: 401 })
    const { data: profile, error: profileError } = await client.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profileError) return Response.json({ error: 'تعذر التحقق من صلاحيات الإدارة. حاولي مجددًا.' }, { status: 503 })
    if (profile?.role !== 'admin') return Response.json({ error: 'ليست لديك صلاحية إضافة المنتجات.' }, { status: 403 })
    if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) return Response.json({ error: 'بيانات المنتج غير صالحة.' }, { status: 400 })
    if (Number(request.headers.get('content-length') || 0) > MAX_PRODUCT_IMAGE_BYTES + 128 * 1024) return Response.json({ error: 'حجم الصورة يجب ألا يتجاوز 5 ميغابايت.' }, { status: 413 })
    let form: FormData
    let variants: unknown
    try {
      form = await request.formData()
      variants = JSON.parse(String(form.get('variants') || ''))
    } catch {
      return Response.json({ error: 'بيانات المنتج غير صالحة.' }, { status: 400 })
    }
    const parsed = productInputSchema.safeParse({
      product_id: form.get('product_id'), name: form.get('name'),
      description: form.get('description') || '', price: form.get('price'),
      is_active: form.get('is_active') === 'on', variants,
    })
    if (!parsed.success) return Response.json({ error: parsed.error.issues.find(issue => issue.code === 'custom')?.message || 'راجعي الاسم والسعر وخيارات المخزون. السعر لا يزيد عن منزلتين عشريتين والمخزون عدد صحيح غير سالب.' }, { status: 400 })
    const input = parsed.data
    const image = form.get('image')
    let imageBytes: Uint8Array | null = null
    let format: ReturnType<typeof detectImageFormat> = null
    if (image instanceof File && image.size > 0) {
      if (image.size > MAX_PRODUCT_IMAGE_BYTES) return Response.json({ error: 'حجم الصورة يجب ألا يتجاوز 5 ميغابايت.' }, { status: 413 })
      imageBytes = new Uint8Array(await image.arrayBuffer())
      format = detectImageFormat(imageBytes)
      if (!format || image.type !== format.type) return Response.json({ error: 'اختاري صورة JPG أو PNG أو WebP صحيحة.' }, { status: 400 })
    } else if (image && !(image instanceof File)) {
      return Response.json({ error: 'ملف الصورة غير صالح.' }, { status: 400 })
    }
    const admin = createAdminClient()
    const existing = await admin.from('products').select('id, product_variants(id)').eq('id', input.product_id).maybeSingle()
    if (existing.error) return Response.json({ error: 'تعذر التحقق من المنتج. حاولي مجددًا.' }, { status: 503 })
    if (existing.data) {
      if (!existing.data.product_variants?.length) return Response.json({ error: 'يوجد منتج محفوظ بدون خيارات مكتملة. راجعي قائمة المنتجات قبل إعادة الإرسال.' }, { status: 409 })
      return Response.json({ id: existing.data.id, message: 'هذا المنتج محفوظ بالفعل، ولم تتم إضافته مرة أخرى.' })
    }
    let imagePath: string | null = null
    let imageUrl: string | null = null
    async function removeImage() {
      if (!imagePath) return
      const result = await admin.storage.from(PRODUCT_IMAGE_BUCKET).remove([imagePath])
      if (result.error) console.error('Product image cleanup failed:', result.error.message)
    }
    if (imageBytes && format) {
      imagePath = `products/${input.product_id}/${crypto.randomUUID()}.${format.extension}`
      const upload = await admin.storage.from(PRODUCT_IMAGE_BUCKET).upload(imagePath, imageBytes, { contentType: format.type, upsert: false })
      if (upload.error) return Response.json({ error: 'تعذر رفع الصورة. تحققي من الاتصال ومخزن الصور ثم حاولي مجددًا.' }, { status: 502 })
      imageUrl = admin.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(imagePath).data.publicUrl
    }
    // Publish only after the complete stock/variant batch has been saved.
    const created = await admin.from('products').insert({
      id: input.product_id, name: input.name, description: input.description || null,
      price: input.price, image_url: imageUrl, is_active: false,
    }).select('id').single()
    if (created.error || !created.data) {
      const check = await admin.from('products').select('id, image_url').eq('id', input.product_id).maybeSingle()
      if (!check.error && (!check.data || check.data.image_url !== imageUrl)) await removeImage()
      return Response.json({ error: 'تعذر حفظ المنتج. راجعي القائمة قبل إعادة الإرسال للتأكد من عدم حفظه بالفعل.' }, { status: 502 })
    }
    const rows = input.variants.map(variant => {
      const id = crypto.randomUUID()
      return { id, product_id: input.product_id, size: variant.size || null, color: variant.color || null, sku: variant.sku || `AS-${id}`, stock: variant.stock }
    })
    const stock = await admin.from('product_variants').insert(rows).select('id')
    if (stock.error || stock.data?.length !== rows.length) {
      // Roll back only this new draft, never an existing product.
      const rollback = await admin.from('products').delete().eq('id', input.product_id).select('id').single()
      if (!rollback.error && rollback.data) await removeImage()
      return Response.json({ error: rollback.error ? 'تعذر حفظ الخيارات. بقي المنتج مخفيًا؛ راجعيه في قائمة المنتجات قبل إعادة المحاولة.' : stock.error?.code === '23505' ? 'رمز SKU مستخدم مسبقًا. اختاري رمزًا آخر ثم أعيدي المحاولة.' : 'تعذر حفظ خيارات المخزون. لم تتم إضافة المنتج، حاولي مجددًا.' }, { status: 502 })
    }
    if (input.is_active) {
      const visibility = await admin.from('products').update({ is_active: true }).eq('id', input.product_id).select('id').single()
      if (visibility.error || !visibility.data) return Response.json({ id: input.product_id, message: 'تم حفظ المنتج وخياراته. تحققي من حالة ظهوره في القائمة قبل عرضه للزبائن.' }, { status: 201 })
    }
    return Response.json({ id: input.product_id, message: input.is_active ? 'تمت إضافة المنتج وظهر في المتجر.' : 'تمت إضافة المنتج، وهو مخفي من المتجر.' }, { status: 201 })
  } catch {
    return Response.json({ error: 'تعذر إكمال الإضافة. تحققي من قائمة المنتجات قبل إعادة المحاولة.' }, { status: 500 })
  }
}

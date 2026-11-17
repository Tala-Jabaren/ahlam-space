import { MAX_PRODUCT_IMAGE_BYTES, PRODUCT_IMAGE_BUCKET, PRODUCT_IMAGE_TYPES } from '@/components/admin/product-input'
import { detectImageFormat } from '@/lib/file-format'
import { handleSignedUploadRequest } from '@/lib/admin-upload-request'

// Reuses the product-images bucket (public, already live) under a classes/
// prefix, same pattern as course cover images - no new bucket or SQL review
// needed for this feature. class_id is generated client-side before the
// classes row itself exists yet (same pattern as course/product creation),
// so this upload can happen before the classes insert. Hands back a signed
// upload token instead of receiving the image itself - see
// src/lib/admin-upload.ts.
export async function POST(request: Request) {
  return handleSignedUploadRequest(request, {
    ownerField: 'class_id',
    bucket: PRODUCT_IMAGE_BUCKET,
    pathPrefix: 'classes',
    maxBytes: MAX_PRODUCT_IMAGE_BYTES,
    detect: detectImageFormat,
    allowedTypes: PRODUCT_IMAGE_TYPES,
    messages: {
      loginAgain: 'سجّلي الدخول مجددًا لإضافة الصورة.',
      noPermission: 'ليست لديك صلاحية إضافة الصور.',
      invalidBody: 'بيانات الصورة غير صالحة.',
      invalidOwner: 'معرف الحصة غير صالح.',
      tooLarge: 'حجم الصورة يجب ألا يتجاوز 5 ميغابايت.',
      invalidFormat: 'اختاري صورة JPG أو PNG أو WebP صحيحة.',
      signFailed: 'تعذر تجهيز رفع الصورة. تحققي من الاتصال ومخزن الصور ثم حاولي مجددًا.',
      generic: 'تعذر رفع الصورة. حاولي مجددًا.',
    },
  })
}

import { MAX_PRODUCT_IMAGE_BYTES, PRODUCT_IMAGE_BUCKET, PRODUCT_IMAGE_TYPES } from '@/components/admin/product-input'
import { detectImageFormat } from '@/lib/file-format'
import { handleSignedUploadRequest } from '@/lib/admin-upload-request'

// Reuses the product-images bucket (public, already live) under a trips/
// prefix, same as course covers reuse it under courses/ and reviews under
// reviews/ - no new bucket or storage policy needed. trip_id is generated
// client-side before the trip row itself exists yet on create (same
// pattern course/review/product creation already uses), so this upload
// can happen before the insert. Shared gallery images use their own route.
export async function POST(request: Request) {
  return handleSignedUploadRequest(request, {
    ownerField: 'trip_id',
    bucket: PRODUCT_IMAGE_BUCKET,
    pathPrefix: 'trips',
    maxBytes: MAX_PRODUCT_IMAGE_BYTES,
    detect: detectImageFormat,
    allowedTypes: PRODUCT_IMAGE_TYPES,
    messages: {
      loginAgain: 'سجّلي الدخول مجددًا لإضافة الصورة.',
      noPermission: 'ليست لديك صلاحية إضافة الصور.',
      invalidBody: 'بيانات الصورة غير صالحة.',
      invalidOwner: 'معرف المشوار غير صالح.',
      tooLarge: 'حجم الصورة يجب ألا يتجاوز 5 ميغابايت.',
      invalidFormat: 'اختاري صورة JPG أو PNG أو WebP صحيحة.',
      signFailed: 'تعذر تجهيز رفع الصورة. تحققي من الاتصال ومخزن الصور ثم حاولي مجددًا.',
      generic: 'تعذر رفع الصورة. حاولي مجددًا.',
    },
  })
}

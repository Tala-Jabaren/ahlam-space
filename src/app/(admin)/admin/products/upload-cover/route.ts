import { MAX_PRODUCT_IMAGE_BYTES, PRODUCT_IMAGE_BUCKET, PRODUCT_IMAGE_TYPES } from '@/components/admin/product-input'
import { detectImageFormat } from '@/lib/file-format'
import { handleSignedUploadRequest } from '@/lib/admin-upload-request'

// Reuses the product-images bucket under a products/ prefix, same pattern
// as every other cover/photo upload route. product_id is generated
// client-side before the product row exists yet (products/create/route.ts
// already relied on this for its own image handling), so this upload can
// happen before that insert. Split out of products/create/route.ts, which
// used to receive the image itself alongside the rest of the product -
// now it only receives the already-uploaded path. See
// src/lib/admin-upload.ts for why the image can't go straight to that
// route any more (Vercel's 4.5MB request body cap).
export async function POST(request: Request) {
  return handleSignedUploadRequest(request, {
    ownerField: 'product_id',
    bucket: PRODUCT_IMAGE_BUCKET,
    pathPrefix: 'products',
    maxBytes: MAX_PRODUCT_IMAGE_BYTES,
    detect: detectImageFormat,
    allowedTypes: PRODUCT_IMAGE_TYPES,
    messages: {
      loginAgain: 'سجّلي الدخول مجددًا لإضافة الصورة.',
      noPermission: 'ليست لديك صلاحية إضافة الصور.',
      invalidBody: 'بيانات الصورة غير صالحة.',
      invalidOwner: 'معرف المنتج غير صالح.',
      tooLarge: 'حجم الصورة يجب ألا يتجاوز 5 ميغابايت.',
      invalidFormat: 'اختاري صورة JPG أو PNG أو WebP صحيحة.',
      signFailed: 'تعذر تجهيز رفع الصورة. تحققي من الاتصال ومخزن الصور ثم حاولي مجددًا.',
      generic: 'تعذر رفع الصورة. حاولي مجددًا.',
    },
  })
}

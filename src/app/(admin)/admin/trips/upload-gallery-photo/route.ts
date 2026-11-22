import { MAX_PRODUCT_IMAGE_BYTES, PRODUCT_IMAGE_BUCKET, PRODUCT_IMAGE_TYPES } from '@/components/admin/product-input'
import { handleSignedUploadRequest } from '@/lib/admin-upload-request'
import { detectImageFormat } from '@/lib/file-format'

export async function POST(request: Request) {
  return handleSignedUploadRequest(request, {
    ownerField: 'upload_id',
    bucket: PRODUCT_IMAGE_BUCKET,
    pathPrefix: 'trip-gallery',
    maxBytes: MAX_PRODUCT_IMAGE_BYTES,
    detect: detectImageFormat,
    allowedTypes: PRODUCT_IMAGE_TYPES,
    messages: {
      loginAgain: 'سجّلي الدخول مجددًا لإضافة الصورة.',
      noPermission: 'ليست لديك صلاحية إضافة الصور.',
      invalidBody: 'بيانات الصورة غير صالحة.',
      invalidOwner: 'تعذر التحقق من بيانات رفع الصورة.',
      tooLarge: 'حجم الصورة يجب ألا يتجاوز 5 ميغابايت.',
      invalidFormat: 'اختاري صورة JPG أو PNG أو WebP صحيحة.',
      signFailed: 'تعذر تجهيز رفع الصورة. حاولي مجددًا.',
      generic: 'تعذر رفع الصورة. حاولي مجددًا.',
    },
  })
}

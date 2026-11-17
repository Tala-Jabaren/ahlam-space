import { AUDIO_TYPES, MAX_AUDIO_BYTES, MEDITATIONS_AUDIO_BUCKET } from '@/components/admin/course-input'
import { detectAudioFormat } from '@/lib/file-format'
import { handleSignedUploadRequest } from '@/lib/admin-upload-request'

// Signs an upload straight into the private meditations bucket (created by
// supabase/meditations.sql - must already be applied). The bucket has no
// public read access; playback only ever happens through
// get_meditation_audio_path() + a signed URL after a purchase is
// confirmed, so the client keeps using the returned `path`, never a public
// URL. Hands back a signed upload token instead of receiving the audio
// file itself - see src/lib/admin-upload.ts for why (Vercel's 4.5MB
// request body cap is far below the 60MB this route allows).
export async function POST(request: Request) {
  return handleSignedUploadRequest(request, {
    ownerField: 'course_id',
    bucket: MEDITATIONS_AUDIO_BUCKET,
    pathPrefix: '',
    maxBytes: MAX_AUDIO_BYTES,
    detect: detectAudioFormat,
    allowedTypes: AUDIO_TYPES,
    // Browsers frequently report an empty or generic File.type for audio
    // files like .m4a depending on OS codec registration (unlike images,
    // where the browser-reported type is reliable) - the format actually
    // enforced is the one sniffed from the file's own magic bytes via
    // AUDIO_TYPES above, same as before this route moved to signed uploads.
    checkDeclaredType: false,
    messages: {
      loginAgain: 'سجّلي الدخول مجددًا لإضافة الملف الصوتي.',
      noPermission: 'ليست لديك صلاحية إضافة الملفات الصوتية.',
      invalidBody: 'بيانات الملف الصوتي غير صالحة.',
      invalidOwner: 'معرف الكورس غير صالح.',
      tooLarge: 'حجم الملف الصوتي يجب ألا يتجاوز 60 ميغابايت.',
      invalidFormat: 'اختاري ملف صوت MP3 أو WAV أو OGG أو M4A صحيحًا.',
      signFailed: 'تعذر تجهيز رفع الملف الصوتي. تحققي من الاتصال ومن أن مخزن meditations موجود، ثم حاولي مجددًا.',
      generic: 'تعذر رفع الملف الصوتي. حاولي مجددًا.',
    },
  })
}

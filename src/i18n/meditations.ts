export const meditationsAr = {
  heading: 'تأملات', lectures: 'محاضرات', audio: 'تأمل صوتي', price: 'السعر',
  empty: 'لا توجد تأملات متاحة حالياً.', details: 'المزيد من التفاصيل',
  listen: 'استمعي الآن', duration: 'المدة', minutes: 'دقيقة', durationUnknown: 'غير محددة',
  waiting: 'بانتظار تأكيد استلام الحوالة البنكية. سيتاح الاستماع بعد تأكيد الدفع.',
  referenceMissing: 'طلب الشراء بانتظار تأكيد الدفع. تعذر عرض المرجع؛ تواصلي معنا قبل التحويل.',
  audioError: 'تعذر تشغيل التأمل. أعيدي تحميل الصفحة أو تواصلي معنا إذا استمرت المشكلة.',
  accessError: 'تعذر التحقق من حالة الشراء. أعيدي تحميل الصفحة قبل المحاولة مرة أخرى.',
  back: 'العودة إلى المحاضرات والتأملات',
  adminAudio: 'تأمل صوتي', adminPath: 'مسار ملف الصوت داخل مخزن meditations',
  adminDuration: 'المدة بالدقائق', adminPathError: 'استخدمي مسار ملف صوت داخل مخزن meditations، وليس رابطاً عاماً.',
  adminDurationError: 'أدخلي مدة صحيحة بالدقائق أكبر من صفر.',
  adminPathLoadError: 'تعذر تحميل مسارات الصوت. أعيدي التحميل قبل تعديل التأملات.',
}

export const meditationsEn: typeof meditationsAr = {
  heading: 'Meditations', lectures: 'Lectures', audio: 'Guided audio meditation', price: 'Price',
  empty: 'No meditations are available yet.', details: 'More details',
  listen: 'Listen now', duration: 'Duration', minutes: 'minutes', durationUnknown: 'Not specified',
  waiting: 'Waiting for bank transfer confirmation. Listening becomes available once payment is confirmed.',
  referenceMissing: 'Your purchase is awaiting payment confirmation. The reference could not be displayed; contact us before transferring.',
  audioError: 'Unable to play this meditation. Reload the page or contact us if the problem continues.',
  accessError: 'Unable to verify your purchase. Reload the page before trying again.',
  back: 'Back to lectures and meditations',
  adminAudio: 'Audio meditation', adminPath: 'Audio file path in the meditations bucket',
  adminDuration: 'Duration in minutes', adminPathError: 'Use an audio file path inside the meditations bucket, not a public URL.',
  adminDurationError: 'Enter a whole number of minutes greater than zero.',
  adminPathLoadError: 'Unable to load audio paths. Reload before editing meditations.',
}

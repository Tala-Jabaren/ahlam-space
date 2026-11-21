export const checkoutAr = {
  cart: {
    eyebrow: 'متجر الاستوديو',
    title: 'السلة',
    emptyNotice: 'أضيفي منتجًا إلى السلة قبل متابعة إتمام الطلب.',
    empty: 'سلتك فارغة حاليًا.',
    browse: 'تصفحي المتجر',
    decrease: 'إنقاص الكمية',
    increase: 'زيادة الكمية',
    remove: 'إزالة',
    total: 'الإجمالي',
    continue: 'متابعة الشراء',
  },
  order: {
    loading: 'جارٍ تجهيز صفحة الدفع...',
    eyebrow: 'إتمام الطلب',
    title: 'مراجعة وتأكيد الطلب',
    contact: 'معلومات التواصل',
    firstName: 'الاسم الأول',
    lastName: 'اسم العائلة',
    phone: 'رقم الهاتف',
    email: 'البريد الإلكتروني (اختياري)',
    fulfillment: 'طريقة الاستلام',
    delivery: 'توصيل',
    pickup: 'استلام من الاستوديو',
    city: 'المدينة',
    chooseCity: 'اختاري المدينة',
    street: 'البلدة / الشارع',
    streetPlaceholder: 'اسم البلدة، الشارع، ورقم المبنى',
    payment: 'طريقة الدفع',
    paymentDescription:
      'الدفع عبر حوالة بنكية فقط حاليًا. سنعرض تفاصيل التحويل ورمز المرجع الخاص بطلبك بعد التأكيد.',
    summary: 'ملخص الطلب',
    quantity: 'الكمية',
    confirming: 'جارٍ تأكيد الطلب...',
    confirm: 'تأكيد الطلب',
    received: 'تم استلام طلبك بنجاح',
    guestSuccess: 'سنتواصل معك عبر رقم الهاتف لمتابعة تأكيد الطلب.',
    memberSuccess: 'يمكنك متابعة حالة طلبك من قسم الطلبات في المتجر.',
    viewOrders: 'متابعة الطلبات',
  },
  consent: {
    prefix: 'بالمتابعة أنت توافق على',
    terms: 'الشروط',
    and: 'و',
    cancellation: 'سياسة الإلغاء',
  },
  bank: {
    title: 'الدفع عبر حوالة بنكية',
    amount: 'المبلغ المستحق',
    reference: 'رمز المرجع (يرجى كتابته في بيان الحوالة البنكية)',
    details: 'تفاصيل التحويل البنكي',
    holder: 'اسم صاحب الحساب',
    bank: 'البنك',
    account: 'رقم الحساب / IBAN',
    bankPlaceholder: 'اسم البنك',
    accountPlaceholder: 'رقم الحساب / IBAN',
    copyReference: 'نسخ',
    referenceCopied: 'تم النسخ',
    copyAccount: 'نسخ',
    accountCopied: 'تم النسخ',
    transferNote: 'اكتبي رمز المرجع الموضح أعلاه في ملاحظة التحويل.',
  },
  errors: {
    OUT_OF_STOCK: 'عذرًا، أحد المنتجات لم يعد متوفرًا بالكمية المطلوبة.',
    stockProduct: 'عذرًا، {product} لم يعد متوفرًا بالكمية المطلوبة.',
    TOO_MANY_PENDING_ORDERS:
      'لديك عدة طلبات بانتظار الدفع. أكملي دفع طلباتك السابقة أو تواصلي معنا قبل إنشاء طلب جديد.',
    QUANTITY_LIMIT_EXCEEDED:
      'الكمية المطلوبة تتجاوز الحد المسموح للطلب. خفّضي الكمية وحاولي مرة أخرى.',
    INVALID_ITEMS:
      'بعض بيانات المنتجات غير صالحة. راجعي السلة وأضيفي المنتجات من المتجر مجددًا.',
    GUEST_INFO_REQUIRED:
      'أدخلي الاسم الأول واسم العائلة ورقم الهاتف لإتمام الطلب.',
    FORBIDDEN:
      'تعذر تأكيد الطلب بهذا الحساب. سجّلي الدخول مجددًا وحاولي مرة أخرى.',
    FULFILLMENT_REQUIRED: 'اختاري طريقة استلام الطلب.',
    DELIVERY_REQUIRED: 'اختاري المدينة وأدخلي البلدة أو الشارع.',
    AUTH_CHECK_FAILED: 'تعذر التحقق من بيانات الطلب. حاولي مرة أخرى.',
    SESSION_EXPIRED:
      'انتهت جلسة تسجيل الدخول. أدخلي بيانات التواصل لإتمام الطلب كزائرة.',
    generic: 'حدث خطأ أثناء تأكيد الطلب. حاولي مرة أخرى.',
  },
  validation: {
    required: 'يرجى تعبئة هذا الحقل.',
    email: 'أدخلي بريدًا إلكترونيًا صحيحًا.',
    shortPassword: 'كلمة المرور يجب أن تتكون من 6 أحرف على الأقل.',
    invalid: 'راجعي القيمة المدخلة في هذا الحقل.',
  },
  auth: {
    memberAccess: 'دخول العضوات',
    login: 'تسجيل الدخول',
    welcome: 'أهلًا بعودتك إلى مساحة أحلام.',
    artCaption: 'هدوء · حركة · توازن',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    showPassword: 'إظهار كلمة المرور',
    hidePassword: 'إخفاء كلمة المرور',
    loggingIn: 'جارٍ تسجيل الدخول...',
    forgotLink: 'نسيتِ كلمة المرور؟',
    createAccount: 'إنشاء حساب',
    join: 'انضمي إلى مساحة أحلام',
    signup: 'إنشاء حساب',
    signupDescription: 'أنشئي حسابك في مساحة أحلام.',
    creating: 'جارٍ إنشاء الحساب...',
    haveAccount: 'لديكِ حساب بالفعل؟',
    help: 'مساعدة الحساب',
    forgotTitle: 'نسيتِ كلمة المرور؟',
    forgotDescription:
      'سنرسل رابطًا آمنًا لإعادة تعيين كلمة المرور إلى بريدك الإلكتروني.',
    sendReset: 'إرسال رابط إعادة التعيين',
    sending: 'جارٍ الإرسال...',
    resetSent: 'راجعي بريدك الإلكتروني للحصول على رابط إعادة التعيين.',
    resetTitle: 'إعادة تعيين كلمة المرور',
    resetDescription: 'اختاري كلمة مرور جديدة لحسابك.',
    newPassword: 'كلمة المرور الجديدة',
    update: 'تحديث كلمة المرور',
    updating: 'جارٍ التحديث...',
    updated: 'تم تحديث كلمة المرور. سيتم تحويلك إلى تسجيل الدخول...',
    checkEmail: 'راجعي بريدك الإلكتروني لتأكيد حسابك.',
    checkEmailTitle: 'تأكيد البريد الإلكتروني',
    sessionExpired: 'انتهت صلاحية جلستك أو تعذّر التحقق منها. سجّلي الدخول مرة أخرى للمتابعة.',
    checkEmailFor:
      'أرسلنا رابط التأكيد إلى {email}. افتحي بريدك واضغطي الرابط لتفعيل حسابك. إذا لم تجديه، تحققي من الرسائل غير المرغوبة.',
    resend: 'إعادة إرسال الرابط',
    resendCooldown: 'إعادة الإرسال خلال {seconds} ثانية',
    resendSuccess: 'تم إرسال الرابط مرة أخرى.',
    resendError: 'تعذر إرسال الرابط. حاولي مرة أخرى.',
    changeEmail: 'تغيير البريد',
  },
  authErrors: {
    credentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    unconfirmed: 'يرجى تأكيد بريدك الإلكتروني قبل تسجيل الدخول.',
    exists: 'يوجد حساب بهذا البريد الإلكتروني. جرّبي تسجيل الدخول.',
    weak: 'اختاري كلمة مرور أقوى تتكون من 6 أحرف على الأقل.',
    same: 'اختاري كلمة مرور مختلفة عن كلمة المرور الحالية.',
    rate: 'محاولات كثيرة خلال وقت قصير. انتظري قليلًا ثم حاولي مجددًا.',
    expired:
      'جلسة الدخول أو رابط إعادة التعيين غير صالح أو منتهي. اطلبي رابطًا جديدًا.',
    email: 'أدخلي بريدًا إلكترونيًا صحيحًا ومسموحًا.',
    disabled: 'إنشاء الحسابات غير متاح حاليًا. تواصلي معنا.',
    generic: 'تعذر إتمام العملية. تحققي من الاتصال وحاولي مرة أخرى.',
  },
  cities: [
    'القدس',
    'رام الله',
    'البيرة',
    'نابلس',
    'الخليل',
    'بيت لحم',
    'أريحا',
    'جنين',
    'طولكرم',
    'قلقيلية',
    'سلفيت',
    'طوباس',
    'غزة',
    'خان يونس',
    'رفح',
    'دير البلح',
    'جباليا',
    'بيت لاهيا',
    'بيت حانون',
    'الناصرة',
    'حيفا',
    'يافا',
    'تل أبيب',
    'عكا',
    'اللد',
    'الرملة',
    'بئر السبع',
    'أم الفحم',
    'الطيبة',
    'الطيرة',
    'شفاعمرو',
    'سخنين',
    'عرابة',
    'رهط',
    'كفر قاسم',
    'باقة الغربية',
    'طمرة',
    'كرمئيل',
    'طبريا',
    'صفد',
    'نتانيا',
    'هرتسليا',
    'ريشون لتسيون',
    'بيتح تكفا',
    'حولون',
    'بات يام',
    'رحوفوت',
    'عسقلان',
    'أسدود',
    'إيلات',
    'نهاريا',
    'كريات شمونة',
    'مدينة أو بلدة أخرى',
  ],
}

export type CheckoutCopy = typeof checkoutAr

export function checkoutErrorMessage(
  message: string,
  copy: CheckoutCopy,
  items: { variant_id: string; name: string }[] = [],
) {
  if (message.includes('OUT_OF_STOCK')) {
    const id = message.match(/OUT_OF_STOCK:([0-9a-f-]{36})/i)?.[1]
    const item = items.find(
      (value) => value.variant_id.toLowerCase() === id?.toLowerCase(),
    )
    return item
      ? copy.errors.stockProduct.replace('{product}', item.name)
      : copy.errors.OUT_OF_STOCK
  }
  const key = Object.keys(copy.errors).find(
    (code) => /^[A-Z_]+$/.test(code) && message.includes(code),
  ) as keyof CheckoutCopy['errors'] | undefined
  return key ? copy.errors[key] : copy.errors.generic
}

export function authErrorMessage(
  error: { code?: string; message?: string },
  copy: CheckoutCopy,
) {
  const value = `${error.code || ''} ${error.message || ''}`.toLowerCase()
  if (/invalid_login_credentials|invalid(?: login)? credentials/.test(value))
    return copy.authErrors.credentials
  if (/email_not_confirmed|email not confirmed/.test(value))
    return copy.authErrors.unconfirmed
  if (/user_already_exists|email_exists|already registered/.test(value))
    return copy.authErrors.exists
  if (
    /weak_password|password.*(?:short|least)|password.*characters/.test(value)
  )
    return copy.authErrors.weak
  if (/same_password|same password/.test(value)) return copy.authErrors.same
  if (/rate_limit|too many|security purposes/.test(value))
    return copy.authErrors.rate
  if (/session|bad_jwt|otp_expired|expired|invalid.*token/.test(value))
    return copy.authErrors.expired
  if (
    /email_address_invalid|email_address_not_authorized|validation_failed|invalid.*email/.test(
      value,
    )
  )
    return copy.authErrors.email
  if (/signup_disabled|signups not allowed/.test(value))
    return copy.authErrors.disabled
  return copy.authErrors.generic
}

export function localizeValidation(
  target: EventTarget,
  copy: CheckoutCopy,
  clear = false,
) {
  if (!(
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  ))
    return
  target.setCustomValidity('')
  if (clear) return
  target.setCustomValidity(
    target.validity.valueMissing
      ? copy.validation.required
      : target.validity.typeMismatch
        ? copy.validation.email
        : target.validity.tooShort
          ? copy.validation.shortPassword
          : copy.validation.invalid,
  )
}

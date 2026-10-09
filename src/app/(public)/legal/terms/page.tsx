import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalDocument, LegalSection } from '@/components/legal/legal-document'

export const metadata: Metadata = {
  title: 'شروط الاستخدام | مساحة أحلام',
  description: 'شروط استخدام موقع مساحة أحلام والحجز والشراء من المتجر.',
}

// TODO owner to confirm.
export default function TermsPage() {
  return (
    <LegalDocument
      title="شروط الاستخدام"
      introduction="توضح هذه الشروط طريقة استخدام موقع مساحة أحلام والحجز والشراء من خلاله."
    >
      <LegalSection title="استخدام الموقع">
        <p>يرجى تقديم معلومات صحيحة عند إنشاء حساب أو الحجز أو تقديم طلب، حتى نتمكن من التواصل معك وإتمام الخدمة.</p>
        <p>إذا كان لديك حساب، حافظي على خصوصية بيانات الدخول وتواصلي معنا عند ملاحظة استخدام غير معتاد له.</p>
      </LegalSection>
      <LegalSection title="الحجز والشراء">
        <p>راجعي تفاصيل الحصة أو الكورس أو المنتج قبل المتابعة، وتأكدي من صحة بيانات التواصل وعنوان التوصيل عند الحاجة.</p>
        <p>يتم تأكيد الطلب أو الحجز بعد استلام الحوالة البنكية. إرسال الطلب وحده لا يعني تأكيده.</p>
        <p>
          تفاصيل الدفع متاحة في{' '}
          <Link href="/legal/delivery" className="underline underline-offset-4">سياسة التوصيل والدفع</Link>.
        </p>
      </LegalSection>
      <LegalSection title="الإلغاء والبيانات الشخصية">
        <p>
          تخضع إلغاءات الحصص إلى{' '}
          <Link href="/legal/cancellation" className="underline underline-offset-4">سياسة الإلغاء والاسترجاع</Link>.
        </p>
        <p>
          لمعرفة كيفية استخدام بياناتك، اقرئي{' '}
          <Link href="/legal/privacy" className="underline underline-offset-4">سياسة الخصوصية</Link>.
        </p>
      </LegalSection>
    </LegalDocument>
  )
}

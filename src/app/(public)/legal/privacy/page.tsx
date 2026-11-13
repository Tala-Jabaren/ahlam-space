import type { Metadata } from 'next'
import { LegalDocument, LegalSection } from '@/components/legal/legal-document'
import { SUPPORT_EMAIL } from '@/content/site-contact'

export const metadata: Metadata = {
  title: 'سياسة الخصوصية | مساحة أحلام',
  description: 'البيانات التي تجمعها مساحة أحلام، أسباب استخدامها وطريقة طلب حذفها.',
}

// TODO owner to confirm.
export default function PrivacyPage() {
  return (
    <LegalDocument
      title="سياسة الخصوصية"
      introduction="نستخدم البيانات التي تقدمينها لتوفير خدمات مساحة أحلام والتواصل معك بشأن حجوزاتك وطلباتك."
    >
      <LegalSection title="البيانات التي نجمعها">
        <ul className="list-disc space-y-2 ps-5">
          <li>الاسم الأول واسم العائلة.</li>
          <li>رقم الهاتف والبريد الإلكتروني عند تقديمهما.</li>
          <li>عنوان التوصيل عند اختيار التوصيل.</li>
          <li>تفاصيل الحجوزات ومشتريات الكورسات.</li>
          <li>تفاصيل طلبات المتجر، ومنها المنتجات والكميات وطريقة الدفع وحالة الطلب.</li>
        </ul>
      </LegalSection>
      <LegalSection title="لماذا نستخدم هذه البيانات؟">
        <p>نستخدمها لإدارة الحساب والحجوزات، متابعة الدفع، تجهيز الطلبات وتوصيلها، والرد على استفساراتك.</p>
        <p>لا نبيع بياناتك الشخصية.</p>
      </LegalSection>
      <LegalSection title="طلب حذف البيانات">
        <p>يمكنك طلب حذف بياناتك عبر البريد <bdi dir="ltr">{SUPPORT_EMAIL}</bdi>. اذكري في الرسالة أنك تريدين حذف بياناتك، وأضيفي البريد أو رقم الهاتف المرتبط بحسابك أو طلبك حتى نتمكن من تحديد البيانات المطلوبة.</p>
        <p>قد نطلب معلومات تساعدنا على التحقق من أن الطلب يخصك قبل متابعة الحذف.</p>
      </LegalSection>
    </LegalDocument>
  )
}

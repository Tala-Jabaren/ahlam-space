import type { Metadata } from 'next'
import { LegalDocument, LegalSection } from '@/components/legal/legal-document'

export const metadata: Metadata = {
  title: 'سياسة التوصيل والدفع | مساحة أحلام',
  description: 'الحوالة البنكية وتأكيد الطلبات ونطاق التوصيل في مساحة أحلام.',
}

// TODO owner to confirm.
export default function DeliveryPage() {
  return (
    <LegalDocument
      title="سياسة التوصيل والدفع"
      introduction="توضح هذه السياسة طريقة الدفع وتأكيد الطلب أو الحجز ونطاق توصيل منتجات المتجر."
    >
      <LegalSection title="طريقة الدفع والتأكيد">
        <p>الدفع متاح بالحوالة البنكية فقط.</p>
        <p>يتم تأكيد الطلب أو الحجز بعد استلام الحوالة. يبقى الطلب أو الحجز بانتظار التأكيد حتى وصول التحويل.</p>
      </LegalSection>
      <LegalSection title="الطلبات غير المدفوعة">
        <p>تُلغى طلبات المتجر غير المدفوعة تلقائيًا بعد 48 ساعة من إنشائها، وتُعاد المنتجات إلى المخزون.</p>
      </LegalSection>
      <LegalSection title="التوصيل">
        <p>التوصيل متاح داخل المدن المدعومة في قائمة المدن بنموذج إتمام الطلب.</p>
        <p>اختاري المدينة وأدخلي اسم البلدة أو الشارع وبيانات العنوان بدقة لتسهيل التواصل والتوصيل.</p>
      </LegalSection>
    </LegalDocument>
  )
}

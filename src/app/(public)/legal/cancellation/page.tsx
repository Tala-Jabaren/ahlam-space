import type { Metadata } from 'next'
import { LegalDocument, LegalSection } from '@/components/legal/legal-document'

export const metadata: Metadata = {
  title: 'سياسة الإلغاء والاسترجاع | مساحة أحلام',
  description: 'مهلة إلغاء الحصص وسياسة الإلغاء المتأخر في مساحة أحلام.',
}

// TODO owner to confirm.
export default function CancellationPage() {
  return (
    <LegalDocument
      title="سياسة الإلغاء والاسترجاع"
      introduction="يرجى مراجعة مهلة الإلغاء قبل حجز الحصة، والتواصل معنا إذا احتجت إلى توضيح."
    >
      <LegalSection title="إلغاء الحصص">
        <p>يمكن إلغاء الحصة قبل موعد بدايتها بـ24 ساعة على الأقل.</p>
        <p>إذا بقي أقل من 24 ساعة على موعد الحصة، لا يتم استرجاع المبلغ أو إعادة جدولة الحجز.</p>
      </LegalSection>
      <LegalSection title="الاستفسار عن الاسترجاع">
        <p>للاستفسار عن حجز أو طلب أو شراء كورس، تواصلي معنا على البريد الموضح أدناه، مع ذكر رقم الحجز أو الطلب إن توفر.</p>
      </LegalSection>
    </LegalDocument>
  )
}

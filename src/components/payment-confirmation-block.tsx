import { bankDetails } from '@/lib/bank-details'

type Props = {
  amount: number
  reference: string
  title?: string
}

// Shown right after placing an order / buying a course / booking a paid
// session, and again in My Orders / My Bookings for anything still unpaid.
export default function PaymentConfirmationBlock({
  amount,
  reference,
  title = 'الدفع عبر حوالة بنكية',
}: Props) {
  return (
    <div
      dir="rtl"
      className="rounded-lg border border-[#617A55]/15 bg-[#D6E2B6]/35 p-5 text-sm leading-7 text-[#25311f]"
    >
      <p className="font-serif text-lg">{title}</p>
      <p className="mt-2">
        المبلغ المستحق: <strong>₪{amount}</strong>
      </p>
      <p>
        رمز المرجع (يرجى كتابته في بيان الحوالة البنكية):{' '}
        <strong className="font-mono" dir="ltr">
          {reference}
        </strong>
      </p>

      <div className="mt-3 border-t border-[#617A55]/15 pt-3">
        <p className="font-semibold">تفاصيل التحويل البنكي</p>
        <p>اسم صاحب الحساب: {bankDetails.accountHolder}</p>
        <p>البنك: {bankDetails.bankName}</p>
        <p>رقم الحساب / IBAN: {bankDetails.accountNumber}</p>
      </div>
    </div>
  )
}

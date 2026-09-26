'use client'

export type PaymentMethod =
  | 'bank_transfer'
  | 'cash_at_studio'
  | 'card_gateway'

type Props = {
  value: PaymentMethod | null
  onChange: (value: PaymentMethod) => void
  name?: string
}

const paymentMethods: {
  value: PaymentMethod
  label: string
  description: string
  disabled?: boolean
}[] = [
  {
    value: 'bank_transfer',
    label: 'حوالة بنكية',
    description: 'سنشارك تفاصيل التحويل بعد تأكيد الطلب.',
  },
  {
    value: 'cash_at_studio',
    label: 'الدفع عند الحضور',
    description: 'ادفعي في الاستوديو عند الوصول.',
  },
  {
    value: 'card_gateway',
    label: 'الدفع الإلكتروني (قريبًا)',
    description: 'بوابة الدفع الإلكتروني قيد التجهيز.',
    disabled: true,
  },
]

export default function PaymentMethodSelector({
  value,
  onChange,
  name = 'payment-method',
}: Props) {
  return (
    <fieldset className="space-y-3" dir="rtl">
      <legend className="sr-only">طريقة الدفع</legend>
      {paymentMethods.map((method) => {
        const isSelected = value === method.value
        const inputId = `${name}-${method.value}`

        return (
          <label
            key={method.value}
            htmlFor={inputId}
            aria-disabled={method.disabled}
            className={`block rounded-lg border p-4 text-right transition ${
              method.disabled
                ? 'cursor-not-allowed border-[#617A55]/10 bg-[#F7F6F0]/60 text-[#617A55]/45'
                : isSelected
                  ? 'cursor-pointer border-[#617A55] bg-[#D6E2B6]/65 shadow-sm'
                  : 'cursor-pointer border-[#617A55]/15 bg-[#F7F6F0] hover:border-[#617A55]/45 hover:bg-[#C7D6E8]/25'
            }`}
          >
            <span className="flex items-start gap-3">
              <input
                id={inputId}
                type="radio"
                name={name}
                value={method.value}
                checked={isSelected}
                disabled={method.disabled}
                onChange={() => onChange(method.value)}
                className="mt-1 size-4 accent-[#617A55]"
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-[#25311f]">
                    {method.label}
                  </span>
                  {method.disabled && (
                    <span className="rounded-full bg-[#C7D6E8]/80 px-2 py-0.5 text-[11px] font-semibold text-[#617A55]">
                      قريبًا
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-sm leading-6">
                  {method.description}
                </span>
              </span>
            </span>
          </label>
        )
      })}
    </fieldset>
  )
}

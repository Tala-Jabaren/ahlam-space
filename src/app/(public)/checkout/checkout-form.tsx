'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthSessionMissingError } from '@supabase/supabase-js'
import PaymentMethodSelector, {
  type PaymentMethod,
} from '@/components/payment-method-selector'
import { useCart } from '@/lib/cart/cart-context'
import { createClient } from '@/lib/supabase/client'

type FulfillmentMethod = 'delivery' | 'pickup'

const subscribeToHydration = () => () => {}

const deliveryCities = [
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
] as const

function formatPrice(price: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price)
}

export default function CheckoutForm({
  isInitiallyLoggedIn,
}: {
  isInitiallyLoggedIn: boolean
}) {
  const router = useRouter()
  const { items, totalPrice, clearCart } = useCart()
  const isMounted = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false
  )
  const [fulfillmentMethod, setFulfillmentMethod] =
    useState<FulfillmentMethod | null>(null)
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod | null>(null)
  const [deliveryCity, setDeliveryCity] = useState('')
  const [deliveryStreet, setDeliveryStreet] = useState('')
  const [isGuest, setIsGuest] = useState(!isInitiallyLoggedIn)
  const [guestFirstName, setGuestFirstName] = useState('')
  const [guestLastName, setGuestLastName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)

  useEffect(() => {
    if (!isMounted || items.length > 0 || orderId) {
      return
    }

    router.replace('/cart?message=empty-checkout')
  }, [isMounted, items.length, orderId, router])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (
      isGuest &&
      (!guestFirstName.trim() || !guestLastName.trim() || !guestPhone.trim())
    ) {
      setError('أدخلي الاسم الأول واسم العائلة ورقم الهاتف لإتمام الطلب.')
      return
    }

    if (!fulfillmentMethod) {
      setError('اختاري طريقة استلام الطلب.')
      return
    }

    if (
      fulfillmentMethod === 'delivery' &&
      (!deliveryCity || !deliveryStreet.trim())
    ) {
      setError('اختاري المدينة وأدخلي البلدة أو الشارع.')
      return
    }

    if (!paymentMethod || paymentMethod === 'card_gateway') {
      setError('اختاري طريقة دفع متاحة.')
      return
    }

    if (items.length === 0) {
      router.replace('/cart?message=empty-checkout')
      return
    }

    setIsSubmitting(true)
    const supabase = createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError && !isAuthSessionMissingError(userError)) {
      setError('تعذر التحقق من بيانات الطلب. حاولي مرة أخرى.')
      setIsSubmitting(false)
      return
    }

    if (!user && !isGuest) {
      setIsGuest(true)
      setError('انتهت جلسة تسجيل الدخول. أدخلي بيانات التواصل لإتمام الطلب كزائرة.')
      setIsSubmitting(false)
      return
    }

    const rpcItems = items.map((item) => ({
      variant_id: item.variant_id,
      quantity: item.quantity,
    }))

    const { data, error: orderError } = await supabase.rpc('place_order', {
      p_user_id: user?.id ?? null,
      p_items: rpcItems,
      p_fulfillment_method: fulfillmentMethod,
      p_payment_method: paymentMethod,
      p_delivery_address:
        fulfillmentMethod === 'delivery'
          ? `${deliveryCity}، ${deliveryStreet.trim()}`
          : null,
      p_guest_name: user
        ? null
        : `${guestFirstName.trim()} ${guestLastName.trim()}`,
      p_guest_phone: user ? null : guestPhone.trim(),
      p_guest_email: user ? null : guestEmail.trim() || null,
    })

    if (orderError) {
      const stockMatch = orderError.message.match(
        /OUT_OF_STOCK:([0-9a-f-]{36})/i
      )

      if (stockMatch) {
        const unavailableItem = items.find(
          (item) => item.variant_id === stockMatch[1]
        )
        setError(
          unavailableItem
            ? `عذرًا، ${unavailableItem.name} لم يعد متوفرًا بالكمية المطلوبة.`
            : 'عذرًا، أحد المنتجات لم يعد متوفرًا بالكمية المطلوبة.'
        )
      } else {
        setError('حدث خطأ أثناء تأكيد الطلب. حاولي مرة أخرى.')
      }

      setIsSubmitting(false)
      return
    }

    const newOrderId = data as string
    clearCart()
    setOrderId(newOrderId)
    setIsSubmitting(false)
    if (user) {
      window.setTimeout(() => {
        router.replace('/orders')
      }, 1800)
    }
  }

  if (!isMounted || (items.length === 0 && !orderId)) {
    return (
      <div className="grid min-h-[50vh] place-items-center px-5" dir="rtl">
        <p className="text-[#617A55]">جارٍ تجهيز صفحة الدفع...</p>
      </div>
    )
  }

  if (orderId) {
    return (
      <div className="px-5 py-20 sm:px-8" dir="rtl">
        <section className="mx-auto max-w-xl rounded-lg border border-[#617A55]/15 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-[#D6E2B6] text-2xl text-[#617A55]">
            ✓
          </div>
          <h1 className="mt-5 text-3xl font-semibold text-[#25311f]">
            تم استلام طلبك بنجاح
          </h1>
          <p className="mt-3 leading-7 text-[#617A55]">
            رقم الطلب: <span dir="ltr">{orderId}</span>
          </p>
          <p className="mt-2 text-sm text-[#617A55]">
            {isGuest
              ? 'سنتواصل معك عبر رقم الهاتف لمتابعة الدفع وتأكيد تفاصيل الطلب.'
              : 'سيتم تحويلك إلى صفحة طلباتك الآن.'}
          </p>
        </section>
      </div>
    )
  }

  return (
    <div className="bg-[#F7F6F0] px-5 py-12 sm:px-8 lg:px-10" dir="rtl">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-medium text-[#617A55]">إتمام الطلب</p>
        <h1 className="mt-2 text-4xl font-semibold text-[#25311f] sm:text-5xl">
          مراجعة وتأكيد الطلب
        </h1>

        <form
          className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)]"
          onSubmit={handleSubmit}
        >
          <div className="space-y-8">
            {isGuest && (
              <section className="rounded-lg border border-[#617A55]/15 bg-white p-5 sm:p-7">
                <h2 className="text-xl font-semibold text-[#25311f]">
                  معلومات التواصل
                </h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium text-[#25311f]">
                    الاسم الأول
                    <input
                      type="text"
                      value={guestFirstName}
                      onChange={(event) => setGuestFirstName(event.target.value)}
                      required
                      autoComplete="given-name"
                      className="min-h-12 rounded-lg border border-[#617A55]/20 bg-[#F7F6F0] px-4 font-normal outline-none transition focus:border-[#617A55]"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-[#25311f]">
                    اسم العائلة
                    <input
                      type="text"
                      value={guestLastName}
                      onChange={(event) => setGuestLastName(event.target.value)}
                      required
                      autoComplete="family-name"
                      className="min-h-12 rounded-lg border border-[#617A55]/20 bg-[#F7F6F0] px-4 font-normal outline-none transition focus:border-[#617A55]"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-[#25311f]">
                    رقم الهاتف
                    <input
                      type="tel"
                      value={guestPhone}
                      onChange={(event) => setGuestPhone(event.target.value)}
                      required
                      autoComplete="tel"
                      inputMode="tel"
                      className="min-h-12 rounded-lg border border-[#617A55]/20 bg-[#F7F6F0] px-4 font-normal outline-none transition focus:border-[#617A55]"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-[#25311f]">
                    البريد الإلكتروني (اختياري)
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(event) => setGuestEmail(event.target.value)}
                      autoComplete="email"
                      dir="ltr"
                      className="min-h-12 rounded-lg border border-[#617A55]/20 bg-[#F7F6F0] px-4 text-right font-normal outline-none transition focus:border-[#617A55]"
                    />
                  </label>
                </div>
              </section>
            )}

            <section className="rounded-lg border border-[#617A55]/15 bg-white p-5 sm:p-7">
              <h2 className="text-xl font-semibold text-[#25311f]">
                طريقة الاستلام
              </h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ['delivery', 'توصيل'],
                    ['pickup', 'استلام من الاستوديو'],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition ${
                      fulfillmentMethod === value
                        ? 'border-[#617A55] bg-[#D6E2B6]/65'
                        : 'border-[#617A55]/15 bg-[#F7F6F0] hover:border-[#617A55]/45'
                    }`}
                  >
                    <input
                      type="radio"
                      name="fulfillment-method"
                      value={value}
                      checked={fulfillmentMethod === value}
                      onChange={() => setFulfillmentMethod(value)}
                      className="size-4 accent-[#617A55]"
                    />
                    <span className="font-medium text-[#25311f]">{label}</span>
                  </label>
                ))}
              </div>

              {fulfillmentMethod === 'delivery' && (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium text-[#25311f]">
                    المدينة
                    <select
                      value={deliveryCity}
                      onChange={(event) => setDeliveryCity(event.target.value)}
                      required
                      className="min-h-12 rounded-lg border border-[#617A55]/20 bg-[#F7F6F0] px-4 font-normal outline-none transition focus:border-[#617A55]"
                    >
                      <option value="">اختاري المدينة</option>
                      {deliveryCities.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-[#25311f]">
                    البلدة / الشارع
                    <input
                      type="text"
                      value={deliveryStreet}
                      onChange={(event) => setDeliveryStreet(event.target.value)}
                      required
                      autoComplete="street-address"
                      placeholder="اسم البلدة، الشارع، ورقم المبنى"
                      className="min-h-12 rounded-lg border border-[#617A55]/20 bg-[#F7F6F0] px-4 font-normal outline-none transition placeholder:text-[#617A55]/50 focus:border-[#617A55]"
                    />
                  </label>
                </div>
              )}
            </section>

            <section className="rounded-lg border border-[#617A55]/15 bg-white p-5 sm:p-7">
              <h2 className="mb-5 text-xl font-semibold text-[#25311f]">
                طريقة الدفع
              </h2>
              <PaymentMethodSelector
                value={paymentMethod}
                onChange={setPaymentMethod}
                name="checkout-payment-method"
              />
            </section>
          </div>

          <aside className="rounded-lg border border-[#617A55]/15 bg-white p-5 sm:p-7 lg:sticky lg:top-28">
            <h2 className="text-xl font-semibold text-[#25311f]">ملخص الطلب</h2>
            <ul className="mt-5 divide-y divide-[#617A55]/10">
              {items.map((item) => (
                <li key={item.variant_id} className="py-4 first:pt-0">
                  <div className="flex justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-medium text-[#25311f]">{item.name}</h3>
                      {(item.size || item.color) && (
                        <p className="mt-1 text-sm text-[#617A55]">
                          {[item.size, item.color].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-[#617A55]">
                        الكمية: {item.quantity}
                      </p>
                    </div>
                    <p className="shrink-0 font-medium text-[#25311f]" dir="ltr">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center justify-between border-t border-[#617A55]/15 pt-5 text-lg font-semibold text-[#25311f]">
              <span>الإجمالي</span>
              <span dir="ltr">{formatPrice(totalPrice)}</span>
            </div>

            {error && (
              <p className="mt-5 rounded-lg bg-[#C7D6E8]/45 p-4 text-sm leading-6 text-[#25311f]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#617A55] px-6 py-3 font-semibold text-white transition hover:bg-[#526849] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'جارٍ تأكيد الطلب...' : 'تأكيد الطلب'}
            </button>
          </aside>
        </form>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { isAuthSessionMissingError } from '@supabase/supabase-js'
import PaymentConfirmationBlock from '@/components/payment-confirmation-block'
import { useCart } from '@/lib/cart/cart-context'
import { createClient } from '@/lib/supabase/client'

import { useT } from '@/i18n/i18n-context'
import {
  checkoutAr,
  checkoutErrorMessage,
  localizeValidation,
} from '@/i18n/checkout-ar'

type FulfillmentMethod = 'delivery' | 'pickup'

const subscribeToHydration = () => () => {}

const deliveryCities = checkoutAr.cities

export default function CheckoutForm({
  isInitiallyLoggedIn,
}: {
  isInitiallyLoggedIn: boolean
}) {
  const { t, locale, dir } = useT()
  const c = t.checkout ?? checkoutAr
  const formatPrice = (price: number) =>
    new Intl.NumberFormat(locale === 'ar' ? 'ar' : 'en-US', {
      style: 'currency',
      currency: 'ILS',
    }).format(price)
  const formatNumber = (value: number) =>
    new Intl.NumberFormat(locale === 'ar' ? 'ar' : 'en-US').format(value)
  const router = useRouter()
  const { items, totalPrice, clearCart } = useCart()
  const isMounted = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  )
  const [fulfillmentMethod, setFulfillmentMethod] =
    useState<FulfillmentMethod | null>(null)
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
  const [orderReference, setOrderReference] = useState<string | null>(null)
  const [orderTotal, setOrderTotal] = useState<number | null>(null)

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
      setError('GUEST_INFO_REQUIRED')
      return
    }

    if (!fulfillmentMethod) {
      setError('FULFILLMENT_REQUIRED')
      return
    }

    if (
      fulfillmentMethod === 'delivery' &&
      (!deliveryCity || !deliveryStreet.trim())
    ) {
      setError('DELIVERY_REQUIRED')
      return
    }

    if (items.length === 0) {
      router.replace('/cart?message=empty-checkout')
      return
    }

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError && !isAuthSessionMissingError(userError)) {
        setError('AUTH_CHECK_FAILED')
        setIsSubmitting(false)
        return
      }

      if (!user && !isGuest) {
        setIsGuest(true)
        setError('SESSION_EXPIRED')
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
        p_payment_method: 'bank_transfer',
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
        setError(orderError.message)
        setIsSubmitting(false)
        return
      }

      const result = data as { id: string; reference: string; total: number }
      clearCart()
      setOrderId(result.id)
      setOrderReference(result.reference)
      setOrderTotal(result.total)
      setIsSubmitting(false)
    } catch {
      setError('generic')
      setIsSubmitting(false)
    }
  }

  if (!isMounted || (items.length === 0 && !orderId)) {
    return (
      <div className="grid min-h-[50vh] place-items-center px-5" dir={dir}>
        <p className="text-[#617A55]">{c.order.loading}</p>
      </div>
    )
  }

  if (orderId && orderReference && orderTotal !== null) {
    return (
      <div className="px-5 py-20 sm:px-8" dir={dir}>
        <section className="mx-auto max-w-xl rounded-lg border border-[#617A55]/15 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-[#D6E2B6] text-2xl text-[#617A55]">
            ✓
          </div>
          <h1 className="mt-5 text-3xl font-semibold text-[#25311f]">
            {c.order.received}
          </h1>
          <p className="mt-3 text-sm text-[#617A55]">
            {isGuest ? c.order.guestSuccess : c.order.memberSuccess}
          </p>

          <div className="mt-6 text-start">
            <PaymentConfirmationBlock
              amount={orderTotal}
              reference={orderReference}
            />
          </div>

          {!isGuest && (
            <button
              type="button"
              onClick={() => router.replace('/orders')}
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-[#617A55] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#526849]"
            >
              {c.order.viewOrders}
            </button>
          )}
        </section>
      </div>
    )
  }

  return (
    <div className="bg-[#F7F6F0] px-5 py-12 sm:px-8 lg:px-10" dir={dir}>
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-medium text-[#617A55]">{c.order.eyebrow}</p>
        <h1 className="mt-2 text-4xl font-semibold text-[#25311f] sm:text-5xl">
          {c.order.title}
        </h1>

        <form
          className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)]"
          key={locale}
          onInvalid={(event) => localizeValidation(event.target, c)}
          onInput={(event) => localizeValidation(event.target, c, true)}
          onSubmit={handleSubmit}
        >
          <div className="space-y-8">
            {isGuest && (
              <section className="rounded-lg border border-[#617A55]/15 bg-white p-5 sm:p-7">
                <h2 className="text-xl font-semibold text-[#25311f]">
                  {c.order.contact}
                </h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium text-[#25311f]">
                    {c.order.firstName}
                    <input
                      type="text"
                      value={guestFirstName}
                      onChange={(event) =>
                        setGuestFirstName(event.target.value)
                      }
                      required
                      autoComplete="given-name"
                      className="min-h-12 min-w-0 w-full rounded-lg border border-[#617A55]/20 bg-[#F7F6F0] px-4 font-normal outline-none transition focus:border-[#617A55]"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-[#25311f]">
                    {c.order.lastName}
                    <input
                      type="text"
                      value={guestLastName}
                      onChange={(event) => setGuestLastName(event.target.value)}
                      required
                      autoComplete="family-name"
                      className="min-h-12 min-w-0 w-full rounded-lg border border-[#617A55]/20 bg-[#F7F6F0] px-4 font-normal outline-none transition focus:border-[#617A55]"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-[#25311f]">
                    {c.order.phone}
                    <input
                      type="tel"
                      value={guestPhone}
                      onChange={(event) => setGuestPhone(event.target.value)}
                      required
                      autoComplete="tel"
                      inputMode="tel"
                      className="min-h-12 min-w-0 w-full rounded-lg border border-[#617A55]/20 bg-[#F7F6F0] px-4 font-normal outline-none transition focus:border-[#617A55]"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-[#25311f]">
                    {c.order.email}
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(event) => setGuestEmail(event.target.value)}
                      autoComplete="email"
                      dir="ltr"
                      className="min-h-12 min-w-0 w-full rounded-lg border border-[#617A55]/20 bg-[#F7F6F0] px-4 text-start font-normal outline-none transition focus:border-[#617A55]"
                    />
                  </label>
                </div>
              </section>
            )}

            <section className="rounded-lg border border-[#617A55]/15 bg-white p-5 sm:p-7">
              <h2 className="text-xl font-semibold text-[#25311f]">
                {c.order.fulfillment}
              </h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ['delivery', c.order.delivery],
                    ['pickup', c.order.pickup],
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
                    {c.order.city}
                    <select
                      aria-label={c.order.city}
                      value={deliveryCity}
                      onChange={(event) => setDeliveryCity(event.target.value)}
                      required
                      className="min-h-12 min-w-0 w-full rounded-lg border border-[#617A55]/20 bg-[#F7F6F0] px-4 font-normal outline-none transition focus:border-[#617A55]"
                    >
                      <option value="">{c.order.chooseCity}</option>
                      {deliveryCities.map((city, index) => (
                        <option key={city} value={city}>
                          {c.cities[index]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-[#25311f]">
                    {c.order.street}
                    <input
                      type="text"
                      value={deliveryStreet}
                      onChange={(event) =>
                        setDeliveryStreet(event.target.value)
                      }
                      required
                      autoComplete="street-address"
                      placeholder={c.order.streetPlaceholder}
                      className="min-h-12 min-w-0 w-full rounded-lg border border-[#617A55]/20 bg-[#F7F6F0] px-4 font-normal outline-none transition placeholder:text-[#617A55]/50 focus:border-[#617A55]"
                    />
                  </label>
                </div>
              )}
            </section>

            <section className="rounded-lg border border-[#617A55]/15 bg-white p-5 sm:p-7">
              <h2 className="text-xl font-semibold text-[#25311f]">
                {c.order.payment}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#617A55]">
                {c.order.paymentDescription}
              </p>
            </section>
          </div>

          <aside className="rounded-lg border border-[#617A55]/15 bg-white p-5 sm:p-7 lg:sticky lg:top-28">
            <h2 className="text-xl font-semibold text-[#25311f]">
              {c.order.summary}
            </h2>
            <ul className="mt-5 divide-y divide-[#617A55]/10">
              {items.map((item) => (
                <li key={item.variant_id} className="py-4 first:pt-0">
                  <div className="flex justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-medium text-[#25311f]">
                        {item.name}
                      </h3>
                      {(item.size || item.color) && (
                        <p className="mt-1 text-sm text-[#617A55]">
                          {[item.size, item.color].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-[#617A55]">
                        {c.order.quantity}: {formatNumber(item.quantity)}
                      </p>
                    </div>
                    <p
                      className="shrink-0 font-medium text-[#25311f]"
                      dir="ltr"
                    >
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center justify-between border-t border-[#617A55]/15 pt-5 text-lg font-semibold text-[#25311f]">
              <span>{c.cart.total}</span>
              <span dir="ltr">{formatPrice(totalPrice)}</span>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-5 rounded-lg bg-[#C7D6E8]/45 p-4 text-sm leading-6 text-[#25311f]"
              >
                {checkoutErrorMessage(error, c, items)}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#617A55] px-6 py-3 font-semibold text-white transition hover:bg-[#526849] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? c.order.confirming : c.order.confirm}
            </button>
            <p className="mt-3 text-center text-xs leading-6 text-[#617A55]/70">
              {c.consent.prefix}{' '}
              <Link href="/legal/terms" className="underline">
                {c.consent.terms}
              </Link>{' '}
              {c.consent.and}{' '}
              <Link href="/legal/cancellation" className="underline">
                {c.consent.cancellation}
              </Link>
            </p>
          </aside>
        </form>
      </div>
    </div>
  )
}

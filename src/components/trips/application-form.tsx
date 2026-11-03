'use client'

import { useId, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { tripApplicationInputSchema } from '@/lib/trips'

const RPC_ERROR_MESSAGES: Record<string, string> = {
  FORBIDDEN: 'سجّلي الدخول مجددًا للمتابعة.',
  CONSENT_REQUIRED: 'يجب الموافقة على حفظ الإجابات للمتابعة.',
  TRIP_NOT_FOUND: 'تعذر العثور على هذا المشوار.',
  TRIP_NOT_OPEN: 'التسجيل في هذا المشوار لم يعد متاحًا.',
  DEADLINE_PASSED: 'انتهى موعد التقديم لهذا المشوار.',
  INVALID_NAME: 'أدخلي اسمًا صحيحًا.',
  INVALID_PHONE: 'أدخلي رقم تواصل صحيح.',
  INVALID_EMAIL: 'أدخلي بريدًا إلكترونيًا صحيحًا.',
  ATTENDED_DETAILS_TOO_LONG: 'التفاصيل طويلة جدًا، يرجى اختصارها.',
  INVALID_INTENTION: 'يرجى الإجابة عن هذا السؤال.',
  MISSING_ANSWER: 'يرجى الإجابة عن كل الأسئلة قبل الإرسال.',
  ALREADY_APPLIED: 'قدّمتِ طلب مشاركة لهذا المشوار بالفعل.',
}

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55]'
const inputStyle =
  'mt-2 min-h-11 w-full min-w-0 rounded-lg border border-[#617A55]/25 bg-[#F7F6F0] px-3 py-2 text-sm outline-none focus:border-[#617A55]'

type YesNo = '' | 'yes' | 'no'

function YesNoField({
  legend,
  value,
  onChange,
  error,
}: {
  legend: string
  value: YesNo
  onChange: (value: YesNo) => void
  error?: string
}) {
  const name = useId()
  return (
    <fieldset>
      <legend className="font-semibold text-[#25311f]">{legend}</legend>
      <div className="mt-3 flex flex-wrap gap-3">
        <label
          className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-medium transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#617A55] ${
            value === 'no' ? 'border-[#617A55] bg-[#617A55] text-[#F7F6F0]' : 'border-[#617A55]/25 text-[#617A55] hover:bg-[#D6E2B6]/40'
          }`}
        >
          <input
            type="radio"
            name={name}
            className="sr-only"
            checked={value === 'no'}
            onChange={() => onChange('no')}
          />
          لا
        </label>
        <label
          className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-medium transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#617A55] ${
            value === 'yes' ? 'border-[#617A55] bg-[#617A55] text-[#F7F6F0]' : 'border-[#617A55]/25 text-[#617A55] hover:bg-[#D6E2B6]/40'
          }`}
        >
          <input
            type="radio"
            name={name}
            className="sr-only"
            checked={value === 'yes'}
            onChange={() => onChange('yes')}
          />
          نعم
        </label>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </fieldset>
  )
}

export default function ApplicationForm({
  tripId,
  defaultName,
  defaultPhone,
  defaultEmail,
}: {
  tripId: string
  defaultName: string
  defaultPhone: string
  defaultEmail: string
}) {
  const router = useRouter()
  const [fullName, setFullName] = useState(defaultName)
  const [phone, setPhone] = useState(defaultPhone)
  const [email, setEmail] = useState(defaultEmail)
  const [attendedBefore, setAttendedBefore] = useState<YesNo>('')
  const [attendedDetails, setAttendedDetails] = useState('')
  const [intention, setIntention] = useState('')
  const [comfortableWithStrangers, setComfortableWithStrangers] = useState<YesNo>('')
  const [surgeryLast6Months, setSurgeryLast6Months] = useState<YesNo>('')
  const [didEmotionalRelease, setDidEmotionalRelease] = useState<YesNo>('')
  const [canDoPhysicalActivity, setCanDoPhysicalActivity] = useState<YesNo>('')
  const [wantsNewExperiences, setWantsNewExperiences] = useState<YesNo>('')
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState('')
  const [busy, setBusy] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (submitted) {
    return (
      <div className="mt-10 rounded-2xl border border-[#617A55]/15 bg-white p-8 text-center">
        <h2 className="font-serif text-2xl text-[#25311f]">تم إرسال طلبك</h2>
        <p className="mt-3 text-sm leading-7 text-[#4f5d49]">
          استلمنا طلب مشاركتك. ستراجع أحلام طلبك وتتواصل معك قريبًا.
        </p>
        <Link
          href="/trips"
          className={`mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-[#617A55] px-7 py-3 text-sm font-semibold text-[#F7F6F0] transition-colors hover:bg-[#617A55]/90 ${focusRing}`}
        >
          العودة إلى المشاوير
        </Link>
      </div>
    )
  }

  function yesNoToBoolean(value: YesNo): boolean | null {
    if (value === 'yes') return true
    if (value === 'no') return false
    return null
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError('')

    const payload = {
      trip_id: tripId,
      full_name: fullName,
      phone,
      email,
      attended_before: yesNoToBoolean(attendedBefore),
      attended_details: attendedDetails.trim() || null,
      intention,
      comfortable_with_strangers: yesNoToBoolean(comfortableWithStrangers),
      surgery_last_6_months: yesNoToBoolean(surgeryLast6Months),
      did_emotional_release: yesNoToBoolean(didEmotionalRelease),
      can_do_physical_activity: yesNoToBoolean(canDoPhysicalActivity),
      wants_new_experiences: yesNoToBoolean(wantsNewExperiences),
      consent: consent ? (true as const) : false,
    }

    // Client-side check only, mirroring submit_trip_application()'s own
    // validation so an applicant sees an inline error before round-
    // tripping - the RPC re-validates everything regardless, it's the
    // real trust boundary, not this.
    const result = tripApplicationInputSchema.safeParse(payload)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? '')
        if (key === 'full_name') fieldErrors.fullName = 'أدخلي اسمًا صحيحًا.'
        else if (key === 'phone') fieldErrors.phone = 'أدخلي رقم تواصل صحيح.'
        else if (key === 'email') fieldErrors.email = 'أدخلي بريدًا إلكترونيًا صحيحًا.'
        else if (key === 'intention') fieldErrors.intention = 'يرجى الإجابة عن هذا السؤال (حتى 1500 حرف).'
        else if (key === 'attended_details') fieldErrors.attendedDetails = 'التفاصيل طويلة جدًا، يرجى اختصارها.'
        else if (key === 'consent') fieldErrors.consent = 'يجب الموافقة على حفظ الإجابات للمتابعة.'
        else if (
          ['attended_before', 'comfortable_with_strangers', 'surgery_last_6_months', 'did_emotional_release', 'can_do_physical_activity', 'wants_new_experiences'].includes(key)
        ) {
          fieldErrors[key] = 'يرجى اختيار إجابة.'
        }
      }
      setErrors(fieldErrors)
      return
    }
    setErrors({})

    setBusy(true)
    try {
      const { error } = await createClient().rpc('submit_trip_application', {
        p_trip_id: result.data.trip_id,
        p_full_name: result.data.full_name,
        p_phone: result.data.phone,
        p_email: result.data.email,
        p_attended_before: result.data.attended_before,
        p_attended_details: result.data.attended_details ?? null,
        p_intention: result.data.intention,
        p_comfortable_with_strangers: result.data.comfortable_with_strangers,
        p_surgery_last_6_months: result.data.surgery_last_6_months,
        p_did_emotional_release: result.data.did_emotional_release,
        p_can_do_physical_activity: result.data.can_do_physical_activity,
        p_wants_new_experiences: result.data.wants_new_experiences,
        p_consent: result.data.consent,
      })
      if (error) {
        setSubmitError(RPC_ERROR_MESSAGES[error.message] ?? 'تعذر إرسال الطلب. تحققي من الاتصال ثم حاولي مجددًا.')
        return
      }
      setSubmitted(true)
    } catch {
      setSubmitError('تعذر إرسال الطلب. تحققي من الاتصال ثم حاولي مجددًا.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 rounded-2xl border border-[#617A55]/15 bg-white p-6 sm:p-8">
      <h2 className="font-semibold text-[#25311f]">١. بياناتك للتواصل</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-[#617A55]">
          الاسم
          <input
            required
            maxLength={200}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className={inputStyle}
          />
          {errors.fullName && <p role="alert" className="mt-1 text-xs text-red-700">{errors.fullName}</p>}
        </label>
        <label className="text-sm text-[#617A55]">
          رقم التواصل
          <input
            required
            maxLength={50}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            dir="ltr"
            className={inputStyle}
          />
          {errors.phone && <p role="alert" className="mt-1 text-xs text-red-700">{errors.phone}</p>}
        </label>
      </div>
      <label className="mt-4 block text-sm text-[#617A55]">
        الإيميل
        <input
          required
          type="email"
          maxLength={200}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          dir="ltr"
          className={inputStyle}
        />
        {errors.email && <p role="alert" className="mt-1 text-xs text-red-700">{errors.email}</p>}
      </label>

      <div className="mt-8 border-t border-[#617A55]/10 pt-6">
        <YesNoField
          legend="٢. هل حضرتِ مثل هذه المشاوير سابقًا؟"
          value={attendedBefore}
          onChange={setAttendedBefore}
          error={errors.attended_before}
        />
        <label className="mt-3 block text-sm text-[#617A55]">
          إن كان الجواب نعم، شاركينا بعض التفاصيل (اختياري)
          <textarea
            rows={3}
            maxLength={1000}
            value={attendedDetails}
            onChange={(event) => setAttendedDetails(event.target.value)}
            className={inputStyle}
          />
          {errors.attendedDetails && <p role="alert" className="mt-1 text-xs text-red-700">{errors.attendedDetails}</p>}
        </label>
      </div>

      <div className="mt-8 border-t border-[#617A55]/10 pt-6">
        <label className="block text-sm font-semibold text-[#25311f]">
          ٣. في حال تم اختيارك لخوض هذه التجربة معنا، ما هي نيّتك من هذه التجربة؟
          <textarea
            required
            rows={5}
            maxLength={1500}
            value={intention}
            onChange={(event) => setIntention(event.target.value)}
            className={`${inputStyle} font-normal`}
          />
        </label>
        <p className="mt-1 text-xs text-[#617A55]/70">حتى 1500 حرف ({intention.length}/1500)</p>
        {errors.intention && <p role="alert" className="mt-1 text-xs text-red-700">{errors.intention}</p>}
      </div>

      <div className="mt-8 space-y-6 border-t border-[#617A55]/10 pt-6">
        <YesNoField
          legend="٤. هل تشعرين بالراحة من مشاركتك في نشاطات جماعية مع أشخاص غرباء؟"
          value={comfortableWithStrangers}
          onChange={setComfortableWithStrangers}
          error={errors.comfortable_with_strangers}
        />
        <YesNoField
          legend="٥. هل قمتِ بأي عملية جراحية خلال الأشهر الستة الأخيرة؟"
          value={surgeryLast6Months}
          onChange={setSurgeryLast6Months}
          error={errors.surgery_last_6_months}
        />
        <YesNoField
          legend="٦. هل شاركتِ بأي حلقات تفريغ مشاعري سابقًا (بالتنفس، بالحركة، بالطاقة)؟"
          value={didEmotionalRelease}
          onChange={setDidEmotionalRelease}
          error={errors.did_emotional_release}
        />
        <YesNoField
          legend="٧. هل يمكنك ممارسة الأنشطة البدنية؟"
          value={canDoPhysicalActivity}
          onChange={setCanDoPhysicalActivity}
          error={errors.can_do_physical_activity}
        />
        <YesNoField
          legend="٨. هل شعرتِ بالرغبة في خوض تجارب جديدة والخروج من منطقة الراحة؟"
          value={wantsNewExperiences}
          onChange={setWantsNewExperiences}
          error={errors.wants_new_experiences}
        />
      </div>

      <label className="mt-8 flex items-start gap-3 border-t border-[#617A55]/10 pt-6 text-sm text-[#4f5d49]">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className={`mt-0.5 size-5 shrink-0 accent-[#617A55] ${focusRing}`}
        />
        أوافق على حفظ إجاباتي، بما فيها المعلومات الصحية، لتقييم مدى ملاءمة المشوار لي، وأعلم أنها لا تظهر إلا لأحلام.
      </label>
      {errors.consent && <p role="alert" className="mt-1 text-xs text-red-700">{errors.consent}</p>}

      {submitError && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {submitError}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={busy}
          className={`inline-flex min-h-12 items-center justify-center rounded-full border border-[#617A55]/35 px-7 py-3 text-sm font-semibold text-[#617A55] transition hover:bg-[#D6E2B6]/45 disabled:opacity-50 ${focusRing}`}
        >
          إلغاء
        </button>
        <button
          type="submit"
          disabled={busy}
          className={`inline-flex min-h-12 items-center justify-center rounded-full bg-[#617A55] px-7 py-3 text-sm font-semibold text-[#F7F6F0] transition-colors hover:bg-[#617A55]/90 disabled:opacity-60 ${focusRing}`}
        >
          {busy ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
        </button>
      </div>
    </form>
  )
}

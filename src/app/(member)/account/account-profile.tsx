'use client'

import { FormEvent, ReactNode, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type ProfileValues = {
  firstName: string
  lastName: string
  phone: string
  email: string
  city: string
}

type AccountProfileProps = {
  initialProfile: ProfileValues
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#C7D6E8]/45 text-[#617A55]">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </span>
  )
}

const fields: Array<{
  key: keyof ProfileValues
  label: string
  type: 'text' | 'tel' | 'email'
  placeholder: string
  icon: ReactNode
}> = [
  {
    key: 'firstName',
    label: 'الاسم الأول',
    type: 'text',
    placeholder: 'تالا',
    icon: (
      <>
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
  },
  {
    key: 'lastName',
    label: 'اسم العائلة',
    type: 'text',
    placeholder: 'جبارين',
    icon: (
      <>
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
  },
  {
    key: 'phone',
    label: 'رقم الهاتف',
    type: 'tel',
    placeholder: '059 123 4567',
    icon: (
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.69 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.33 1.84.56 2.8.69A2 2 0 0 1 22 16.92z" />
    ),
  },
  {
    key: 'email',
    label: 'البريد الإلكتروني',
    type: 'email',
    placeholder: 'tala@example.com',
    icon: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
  },
  {
    key: 'city',
    label: 'المدينة / المنطقة',
    type: 'text',
    placeholder: 'رام الله',
    icon: (
      <>
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
  },
]

export default function AccountProfile({ initialProfile }: AccountProfileProps) {
  const [profile, setProfile] = useState(initialProfile)
  const [draft, setDraft] = useState(initialProfile)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  function startEditing() {
    setDraft(profile)
    setMessage('')
    setIsEditing(true)
  }

  function cancelEditing() {
    setDraft(profile)
    setMessage('')
    setIsEditing(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setMessage('')

    const supabase = createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (!user || userError) {
      setMessage('تعذر حفظ التغييرات. يرجى تسجيل الدخول مرة أخرى.')
      setIsSaving(false)
      return
    }

    if (draft.email !== profile.email) {
      const { error: emailError } = await supabase.auth.updateUser({
        email: draft.email.trim(),
      })

      if (emailError) {
        setMessage('تعذر تحديث البريد الإلكتروني. تحققي منه وحاولي مرة أخرى.')
        setIsSaving(false)
        return
      }
    }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: `${draft.firstName.trim()} ${draft.lastName.trim()}`,
      phone: draft.phone.trim(),
      city: draft.city.trim(),
    })

    if (profileError) {
      setMessage('تعذر حفظ المعلومات الآن. حاولي مرة أخرى.')
      setIsSaving(false)
      return
    }

    const nextProfile = {
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      phone: draft.phone.trim(),
      email: draft.email.trim(),
      city: draft.city.trim(),
    }

    setProfile(nextProfile)
    setDraft(nextProfile)
    setIsEditing(false)
    setIsSaving(false)
    setMessage(
      draft.email !== profile.email
        ? 'تم حفظ المعلومات. تحققي من بريدك لتأكيد العنوان الجديد.'
        : 'تم حفظ التغييرات بنجاح.'
    )
  }

  return (
    <section className="relative mt-7 overflow-hidden rounded-lg border border-[#617A55]/10 bg-white/70 p-5 shadow-sm sm:p-7 lg:p-9">
      <div
        aria-hidden="true"
        className="absolute -bottom-8 -left-6 h-32 w-28 opacity-[0.08]"
      >
        <span className="absolute bottom-0 left-12 h-28 w-px rotate-12 bg-[#617A55]" />
        <span className="absolute bottom-12 left-3 h-14 w-8 -rotate-45 rounded-[100%_0_100%_0] bg-[#617A55]" />
        <span className="absolute bottom-16 left-14 h-14 w-8 rotate-12 rounded-[0_100%_0_100%] bg-[#617A55]" />
      </div>

      <div className="relative flex flex-col gap-4 border-b border-[#617A55]/12 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl text-[#617A55] sm:text-3xl">
            معلوماتي الشخصية
          </h2>
          <p className="mt-1 text-sm leading-6 text-[#617A55]/65">
            معلومات التواصل الأساسية الخاصة بحسابك.
          </p>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={startEditing}
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-lg border border-[#617A55]/25 px-5 text-sm font-semibold text-[#617A55] transition hover:bg-[#D6E2B6]/55"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
            </svg>
            تعديل المعلومات
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="relative mt-2">
        <div className="grid md:grid-cols-2 md:gap-x-10">
          {fields.map((field) => (
            <div
              key={field.key}
              className="flex min-w-0 gap-4 border-b border-[#617A55]/10 py-6 last:border-b-0 md:[&:nth-last-child(-n+2)]:border-b-0"
            >
              <Icon>{field.icon}</Icon>
              <div className="min-w-0 flex-1">
                <label
                  htmlFor={field.key}
                  className="block text-sm font-medium text-[#617A55]/65"
                >
                  {field.label}
                </label>
                {isEditing ? (
                  <input
                    id={field.key}
                    name={field.key}
                    type={field.type}
                    dir={field.type === 'email' ? 'ltr' : 'rtl'}
                    value={draft[field.key]}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        [field.key]: event.target.value,
                      }))
                    }
                    placeholder={field.placeholder}
                    required={
                      field.key === 'firstName' ||
                      field.key === 'lastName' ||
                      field.key === 'email'
                    }
                    className="mt-2 min-h-12 w-full rounded-lg border border-[#617A55]/20 bg-[#F7F6F0] px-4 text-base text-[#617A55] outline-none transition placeholder:text-[#617A55]/35 focus:border-[#617A55]/55 focus:ring-2 focus:ring-[#D6E2B6]"
                  />
                ) : (
                  <p
                    className="mt-2 min-h-7 break-words text-base font-semibold text-[#617A55] sm:text-lg"
                    dir={field.type === 'email' ? 'ltr' : 'rtl'}
                  >
                    {profile[field.key] || 'غير محدد'}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {message && (
          <p
            role="status"
            className="mt-5 rounded-lg bg-[#C7D6E8]/45 px-4 py-3 text-sm leading-6 text-[#617A55]"
          >
            {message}
          </p>
        )}

        {isEditing && (
          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#617A55]/12 pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={cancelEditing}
              disabled={isSaving}
              className="min-h-11 rounded-lg border border-[#617A55]/25 px-7 text-sm font-semibold text-[#617A55] transition hover:bg-[#C7D6E8]/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="min-h-11 rounded-lg bg-[#617A55] px-7 text-sm font-semibold text-[#F7F6F0] transition hover:bg-[#617A55]/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
            </button>
          </div>
        )}
      </form>
    </section>
  )
}

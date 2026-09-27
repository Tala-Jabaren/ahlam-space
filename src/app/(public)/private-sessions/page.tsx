'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const SERVICES = [
  {
    title: 'رحلة تيسير الشخصية',
    description:
      'برنامج مرافقة شخصية لمدة شهر كامل. خلال هذا البرنامج لن تكوني وحدك في رحلة التغيير، بل سأكون معك خطوة بخطوة، أتابع تقدمك، وأرسل لك يوميًا توجيهات، وتمارين، وتأملات، أو مهام بسيطة تناسب احتياجاتك وأهدافك. نهدف معًا إلى بناء عادات صحية، وتنظيم مختلف جوانب الحياة، وتعزيز الالتزام، حتى يصبح التغيير أسلوب حياة وليس مجرد مرحلة مؤقتة',
    image: '/images/about2.png',
  },
  {
    title: 'جلسة العلاج بالصوت',
    description:
      'رحلة استرخاء عميقة باستخدام الطاسات التبتية وأدوات العلاج بالصوت، تساعد على تهدئة الجهاز العصبي، وتخفيف التوتر، وتعزيز الشعور',
    image: '/member/yoga-class.png',
  },
  {
    title: 'جلسات فردية خاصة',
    description:
      'جلسات فردية مصممة بما يتناسب مع احتياجاتك، لنستكشف معًا التحديات التي تمرين بها، ونبني خطوات عملية تساعدك على الوصول إلى توازن نفسي وعاطفي أكبر. قد تشمل الجلسات العمل على إدارة الضغوط، تعزيز الثقة بالنفس، تنظيم المشاعر، اكتشاف الأنماط التي تعيقك، ووضع خطة تناسب أهدافك وظروفك.',
    image: '/member/fitness-class.png',
  },
] as const

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error'

export default function PrivateSessionsPage() {
  const formRef = useRef<HTMLFormElement>(null)
  const [sessionType, setSessionType] = useState<string>(SERVICES[0].title)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<SubmitStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  function handleRequestClick(serviceTitle: string) {
    setSessionType(serviceTitle)
    formRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    setErrorMessage(null)

    const supabase = createClient()
    const { error } = await supabase.from('session_requests').insert({
      session_type: sessionType,
      full_name: fullName,
      phone,
      email: email || null,
      message: message || null,
    })

    if (error) {
      setStatus('error')
      setErrorMessage(error.message)
      return
    }

    setStatus('success')
    setFullName('')
    setPhone('')
    setEmail('')
    setMessage('')
  }

  return (
    <div
      dir="rtl"
      className="mx-auto max-w-7xl px-5 py-16 text-[#25311f] sm:px-8 lg:px-10 [&_h1]:mb-10 [&_h1]:font-serif [&_h1]:text-5xl [&_h1]:leading-tight [&_h1]:text-[#25311f] [&_form>h2]:font-serif [&_form>h2]:text-4xl [&_form>h2]:text-[#25311f]"
    >
      <h1>الجلسات الفردية</h1>

      <div className="grid gap-6 xl:grid-cols-2 xl:justify-items-center">
        {SERVICES.map((service) => (
          <section
            key={service.title}
            className="flex h-auto w-full max-w-[620px] flex-col overflow-hidden rounded-[18px] border border-[#617A55]/[0.12] bg-white transition-transform duration-200 hover:-translate-y-[3px] sm:h-[190px] sm:flex-row"
          >
            <div className="relative h-[210px] w-full shrink-0 sm:h-full sm:w-[190px]">
              <Image
                src={service.image}
                alt=""
                fill
                sizes="(min-width: 640px) 190px, 100vw"
                className="object-cover object-center"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col p-5">
              <h2 className="font-serif text-2xl font-medium leading-tight text-[#25311f]">
                {service.title}
              </h2>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#4f5d49]">
                {service.description}
              </p>
              <button
                className="mt-auto self-start rounded-full bg-[#D6E2B6] px-7 py-2.5 text-sm font-medium text-[#617A55] transition-colors hover:bg-[#cbd9a7]"
                type="button"
                onClick={() => handleRequestClick(service.title)}
              >
                احجزي جلسة
              </button>
            </div>
          </section>
        ))}
      </div>

      <hr className="my-12 border-[#617A55]/15" />

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="mx-auto max-w-3xl rounded-[2rem] border border-[#617A55]/10 bg-white/70 p-6 shadow-sm sm:p-8"
      >
        <h2>طلب حجز جلسة</h2>

        <div className="mt-6 grid gap-2 text-sm font-medium text-[#617A55]">
          <label htmlFor="session_type">نوع الجلسة</label>
          <select
            className="rounded-2xl border border-[#617A55]/20 bg-[#F7F6F0] px-4 py-3 text-[#25311f] outline-none transition focus:border-[#617A55]"
            id="session_type"
            value={sessionType}
            onChange={(e) => setSessionType(e.target.value)}
          >
            {SERVICES.map((service) => (
              <option key={service.title} value={service.title}>
                {service.title}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 grid gap-2 text-sm font-medium text-[#617A55]">
          <label htmlFor="full_name">الاسم الكامل</label>
          <input
            className="rounded-2xl border border-[#617A55]/20 bg-[#F7F6F0] px-4 py-3 text-[#25311f] outline-none transition focus:border-[#617A55]"
            id="full_name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

        <div className="mt-5 grid gap-2 text-sm font-medium text-[#617A55]">
          <label htmlFor="phone">رقم الهاتف</label>
          <input
            className="rounded-2xl border border-[#617A55]/20 bg-[#F7F6F0] px-4 py-3 text-[#25311f] outline-none transition focus:border-[#617A55]"
            id="phone"
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>

        <div className="mt-5 grid gap-2 text-sm font-medium text-[#617A55]">
          <label htmlFor="email">البريد الإلكتروني</label>
          <input
            className="rounded-2xl border border-[#617A55]/20 bg-[#F7F6F0] px-4 py-3 text-[#25311f] outline-none transition focus:border-[#617A55]"
            id="email"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="mt-5 grid gap-2 text-sm font-medium text-[#617A55]">
          <label htmlFor="message">رسالة</label>
          <textarea
            className="min-h-36 rounded-2xl border border-[#617A55]/20 bg-[#F7F6F0] px-4 py-3 text-[#25311f] outline-none transition placeholder:text-[#617A55]/55 focus:border-[#617A55]"
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="أخبريني أكثر عن اهتمامك بهذه الجلسة"
          />
        </div>

        <button
          className="mt-6 rounded-full bg-[#617A55] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#4f6645] disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={status === 'submitting'}
        >
          {status === 'submitting' ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
        </button>

        {status === 'success' && (
          <p>تم إرسال طلبك بنجاح، سنتواصل معك قريبًا.</p>
        )}
        {status === 'error' && (
          <p>
            حدث خطأ أثناء إرسال الطلب
            {errorMessage ? `: ${errorMessage}` : ''}. حاولي مرة أخرى.
          </p>
        )}
      </form>
    </div>
  )
}

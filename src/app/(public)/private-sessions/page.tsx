'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const SERVICES = [
  {
    title: 'رحلة تيسير الشخصية',
    description:
      'برنامج مرافقة شخصية لمدة شهر كامل. خلال هذا البرنامج لن تكوني وحدك في رحلة التغيير، بل سأكون معك خطوة بخطوة، أتابع تقدمك، وأرسل لك يوميًا توجيهات، وتمارين، وتأملات، أو مهام بسيطة تناسب احتياجاتك وأهدافك. نهدف معًا إلى بناء عادات صحية، وتنظيم مختلف جوانب الحياة، وتعزيز الالتزام، حتى يصبح التغيير أسلوب حياة وليس مجرد مرحلة مؤقتة',
  },
  {
    title: 'جلسة العلاج بالصوت',
    description:
      'رحلة استرخاء عميقة باستخدام الطاسات التبتية وأدوات العلاج بالصوت، تساعد على تهدئة الجهاز العصبي، وتخفيف التوتر، وتعزيز الشعور',
  },
  {
    title: 'جلسات فردية خاصة',
    description:
      'جلسات فردية مصممة بما يتناسب مع احتياجاتك، لنستكشف معًا التحديات التي تمرين بها، ونبني خطوات عملية تساعدك على الوصول إلى توازن نفسي وعاطفي أكبر. قد تشمل الجلسات العمل على إدارة الضغوط، تعزيز الثقة بالنفس، تنظيم المشاعر، اكتشاف الأنماط التي تعيقك، ووضع خطة تناسب أهدافك وظروفك.',
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
    <div dir="rtl" style={{ maxWidth: 700, margin: '40px auto' }}>
      <h1>الجلسات الفردية</h1>

      {SERVICES.map((service) => (
        <section key={service.title} style={{ marginBottom: 32 }}>
          <h2>{service.title}</h2>
          <p>{service.description}</p>
          <button
            type="button"
            onClick={() => handleRequestClick(service.title)}
          >
            تواصلي لحجز هذه الجلسة
          </button>
        </section>
      ))}

      <hr style={{ margin: '32px 0' }} />

      <form ref={formRef} onSubmit={handleSubmit}>
        <h2>طلب حجز جلسة</h2>

        <div style={{ marginBottom: 12 }}>
          <label htmlFor="session_type">نوع الجلسة</label>
          <br />
          <select
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

        <div style={{ marginBottom: 12 }}>
          <label htmlFor="full_name">الاسم الكامل</label>
          <br />
          <input
            id="full_name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label htmlFor="phone">رقم الهاتف</label>
          <br />
          <input
            id="phone"
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label htmlFor="email">البريد الإلكتروني</label>
          <br />
          <input
            id="email"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label htmlFor="message">رسالة</label>
          <br />
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="أخبريني أكثر عن اهتمامك بهذه الجلسة"
          />
        </div>

        <button type="submit" disabled={status === 'submitting'}>
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

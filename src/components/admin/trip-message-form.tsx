'use client'

import { useState, type FormEvent } from 'react'

const inputStyle = 'mt-2 w-full min-w-0 rounded-lg border border-[#617A55]/25 bg-[#F7F6F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#617A55]'
const buttonStyle = 'inline-flex items-center justify-center gap-2 rounded-lg bg-[#617A55] px-4 py-2 text-sm text-white disabled:opacity-50'

type Step = 'edit' | 'confirm' | 'done'

// Two-step send, matching the brief's "confirmation step showing recipient
// count before sending": the first POST (confirm: false) is a dry run that
// only returns how many approved applicants would receive this - nothing
// is sent, logged, or rate-limited yet. Only the second POST (confirm:
// true, after the admin explicitly confirms) actually sends anything.
export default function TripMessageForm({ tripId, approvedCount }: { tripId: string; approvedCount: number }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('edit')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [recipientCount, setRecipientCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)

  async function preview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setFailed(false)
    try {
      const response = await fetch(`/admin/trips/${tripId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body, confirm: false }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error ?? 'FAILED')
      setRecipientCount(result.recipientCount)
      setStep('confirm')
    } catch (error) {
      setFailed(true)
      setMessage(error instanceof Error && error.message !== 'FAILED' ? error.message : 'تعذر التحقق من عدد المستلمات.')
    } finally {
      setBusy(false)
    }
  }

  async function send() {
    setBusy(true)
    setMessage('')
    setFailed(false)
    try {
      const response = await fetch(`/admin/trips/${tripId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body, confirm: true }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.ok) throw new Error(result?.error ?? 'FAILED')
      setMessage(`تم إرسال الرسالة إلى ${result.sent} مشاركة${result.failed ? ` (تعذر الإرسال إلى ${result.failed}).` : '.'}`)
      setStep('done')
      setSubject('')
      setBody('')
    } catch (error) {
      setFailed(true)
      setMessage(error instanceof Error && error.message !== 'FAILED' ? error.message : 'تعذر إرسال الرسالة.')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <div className="mt-10 border-t border-[#617A55]/15 pt-6">
        <button
          type="button"
          className={buttonStyle}
          onClick={() => {
            setOpen(true)
            setStep('edit')
            setMessage('')
          }}
        >
          إرسال رسالة للمشاركات
        </button>
      </div>
    )
  }

  return (
    <section className="mt-10 rounded-lg border border-[#617A55]/15 bg-white p-5 sm:p-6">
      <h2 className="font-serif text-xl text-[#617A55]">إرسال رسالة للمشاركات</h2>
      <p className="mt-1 text-sm text-[#617A55]/70">
        سيتم إرسال بريد منفصل لكل مشاركة مقبولة بهذا المشوار ({approvedCount} حاليًا) - لا يظهر بريد أي مشاركة للأخريات.
      </p>

      {step === 'edit' && (
        <form onSubmit={preview} className="mt-4 grid gap-4">
          <label className="text-sm">
            عنوان الرسالة
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              required
              maxLength={200}
              className={inputStyle}
            />
          </label>
          <label className="text-sm">
            نص الرسالة
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              required
              rows={6}
              maxLength={5000}
              className={inputStyle}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className={buttonStyle}>
              {busy ? 'جارٍ التحقق…' : 'مراجعة قبل الإرسال'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#617A55]/25 px-4 py-2 text-sm"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      {step === 'confirm' && (
        <div className="mt-4">
          <p role="alert" className="rounded-lg bg-[#D6E2B6]/40 p-4 text-sm">
            سيتم إرسال هذه الرسالة إلى <strong>{recipientCount}</strong> مشاركة مقبولة. هل تريدين المتابعة؟
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => void send()} className={buttonStyle}>
              {busy ? 'جارٍ الإرسال…' : 'تأكيد الإرسال'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setStep('edit')}
              className="inline-flex items-center gap-2 rounded-lg border border-[#617A55]/25 px-4 py-2 text-sm"
            >
              رجوع للتعديل
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={buttonStyle} onClick={() => { setOpen(false); setStep('edit') }}>
            إغلاق
          </button>
        </div>
      )}

      {message && (
        <p role={failed ? 'alert' : 'status'} className={`mt-3 rounded-lg p-3 text-sm ${failed ? 'bg-[#C7D6E8]/50' : 'bg-[#D6E2B6]/50'}`}>
          {message}
        </p>
      )}
    </section>
  )
}

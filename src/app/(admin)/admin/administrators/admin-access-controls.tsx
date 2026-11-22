'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, UserPlus } from 'lucide-react'
import { adminAccessCopy } from '@/i18n/admin-access'
import type { Locale } from '@/i18n/config'
import { createClient } from '@/lib/supabase/client'

export type Administrator = {
  id: string
  full_name: string | null
  email: string | null
  is_primary: boolean
}

type AccessChange = { kind: 'grant'; email: string } | { kind: 'revoke'; id: string }

export default function AdminAccessControls({ administrators, locale }: {
  administrators: Administrator[]
  locale: Locale
}) {
  const copy = adminAccessCopy[locale]
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null)

  async function changeAccess(change: AccessChange) {
    if (pending) return
    setPending(true)
    setFeedback(null)

    try {
      const supabase = createClient()
      const { error } = change.kind === 'grant'
        ? await supabase.rpc('admin_grant_access', { p_email: change.email })
        : await supabase.rpc('admin_revoke_access', { p_user_id: change.id })

      if (error) {
        const messages: Record<string, string> = {
          FORBIDDEN: copy.forbidden,
          ADMIN_ACCOUNT_NOT_FOUND: copy.notFound,
          ADMIN_ACCOUNT_UNCONFIRMED: copy.unconfirmed,
          ADMIN_ACCOUNT_ALREADY_ADMIN: copy.alreadyAdmin,
          PRIMARY_ADMIN_PROTECTED: copy.protectedError,
        }
        setFeedback({ error: true, text: messages[error.message] ?? copy.changeError })
        return
      }

      if (change.kind === 'grant') setEmail('')
      setFeedback({ error: false, text: change.kind === 'grant' ? copy.added : copy.removed })
      router.refresh()
    } catch {
      setFeedback({ error: true, text: copy.changeError })
    } finally {
      setPending(false)
    }
  }

  function addAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void changeAccess({ kind: 'grant', email: email.trim() })
  }

  return (
    <div className="mt-6 grid gap-6">
      <section className="rounded-2xl border border-[#617A55]/15 bg-white p-5 sm:p-6">
        <h2 className="text-xl text-[#465d3d]">{copy.add}</h2>
        <p className="mt-2 text-sm leading-6 text-[#465d3d]">{copy.addHelp}</p>
        <form onSubmit={addAdmin} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="grid min-w-0 grow gap-2 text-sm font-semibold">
            {copy.email}
            <input
              type="email"
              autoComplete="off"
              required
              maxLength={254}
              dir="ltr"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-[#617A55]/25 bg-[#F7F6F0] px-3 font-normal focus-visible:outline-2 focus-visible:outline-[#617A55]"
            />
          </label>
          <button disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#465d3d] px-5 text-sm font-semibold text-white hover:bg-[#34482e] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60">
            <UserPlus aria-hidden="true" size={17} />
            {copy.add}
          </button>
        </form>
      </section>
      {pending && <p role="status" className="text-sm">{copy.saving}</p>}
      {feedback && (
        <p role={feedback.error ? 'alert' : 'status'} className={`rounded-xl px-4 py-3 text-sm ${feedback.error ? 'bg-red-50 text-red-800' : 'bg-[#D6E2B6]/55'}`}>
          {feedback.text}
        </p>
      )}
      <section>
        <h2 className="text-xl text-[#465d3d]">{copy.list}</h2>
        <ul className="mt-3 grid gap-3">
          {administrators.map((account) => {
            const name = account.full_name?.trim() || account.email || copy.admin
            return (
              <li key={account.id} className="flex min-w-0 flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#617A55]/15 bg-white p-4">
                <div className="min-w-0">
                  <p className="font-semibold [overflow-wrap:anywhere]"><bdi>{name}</bdi></p>
                  {account.email && account.email !== name && (
                    <p className="mt-1 text-sm text-[#465d3d] [overflow-wrap:anywhere]"><bdi>{account.email}</bdi></p>
                  )}
                  <span className="mt-2 inline-flex rounded-full bg-[#EAF1F8] px-2.5 py-1 text-xs font-semibold">
                    {account.is_primary ? copy.primary : copy.admin}
                  </span>
                </div>
                {account.is_primary ? (
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-[#465d3d]">
                    <ShieldCheck aria-hidden="true" size={18} />
                    {copy.protected}
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm(copy.confirmRemoval.replace('{account}', () => account.email || name))) {
                        void changeAccess({ kind: 'revoke', id: account.id })
                      }
                    }}
                    className="min-h-11 rounded-full border border-[#617A55]/30 px-4 text-sm font-semibold text-[#465d3d] hover:bg-[#F7F6F0] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
                  >
                    {copy.remove}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

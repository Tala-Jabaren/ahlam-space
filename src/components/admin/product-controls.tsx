'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function ProductActiveToggle({ id, name, active }: { id: string; name: string; active: boolean }) {
  const router = useRouter()
  const [isActive, setIsActive] = useState(active)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)

  async function save(next: boolean) {
    if (busy) return
    setBusy(true)
    setMessage('')
    setFailed(false)
    try {
      const { data, error } = await createClient()
        .from('products')
        .update({ is_active: next })
        .eq('id', id)
        .select('id, is_active')
        .single()
      if (error || !data) throw new Error('Update rejected')
      setIsActive(data.is_active === true)
      setMessage(next ? 'المنتج ظاهر الآن في المتجر.' : 'تمت إزالة المنتج من المتجر. يمكنك إظهاره مجددًا في أي وقت.')
      router.refresh()
    } catch {
      setFailed(true)
      setMessage('تعذر تحديث المنتج. تحققي من الاتصال والصلاحيات ثم حاولي مجددًا.')
    } finally {
      setBusy(false)
    }
  }

  function removeFromShop() {
    if (busy || !isActive) return
    if (!window.confirm(`إزالة «${name}» من المتجر؟ سيُخفى عن الزبائن دون حذف بياناته أو الطلبات السابقة، ويمكنك إظهاره مجددًا.`)) return
    void save(false)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
      <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-[#617A55]">
        <input
          type="checkbox"
          role="switch"
          checked={isActive}
          disabled={busy}
          aria-label={`إظهار ${name} في المتجر`}
          onChange={(event) => void save(event.target.checked)}
          className="size-5 accent-[#617A55] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#617A55] disabled:cursor-wait"
        />
        {busy ? 'جارٍ الحفظ...' : isActive ? 'ظاهر في المتجر' : 'مخفي من المتجر'}
      </label>
      <button
        type="button"
        onClick={removeFromShop}
        disabled={busy || !isActive}
        aria-label={`إزالة ${name} من المتجر`}
        title={isActive ? 'إزالة من المتجر' : 'المنتج مخفي من المتجر بالفعل'}
        className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-lg border border-[#617A55]/20 text-[#617A55] transition hover:bg-[#D6E2B6]/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Trash2 size={18} aria-hidden="true" />
      </button>
      </div>
      {message && <p role={failed ? 'alert' : 'status'} className="mt-1 max-w-sm text-sm leading-6 text-[#617A55]">{message}</p>}
    </div>
  )
}

export function VariantStockEditor({ id, stock, label }: { id: string; stock: number; label: string }) {
  const router = useRouter()
  const [value, setValue] = useState(String(stock))
  const [savedStock, setSavedStock] = useState(stock)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  const number = Number(value)
  const valid = value.trim() !== '' && Number.isInteger(number) && number >= 0 && number <= 2147483647

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    if (!valid) {
      setFailed(true)
      setMessage('أدخلي عددًا صحيحًا غير سالب للمخزون.')
      return
    }
    setBusy(true)
    setFailed(false)
    setMessage('')
    try {
      const { data, error } = await createClient()
        .from('product_variants')
        .update({ stock: number })
        .eq('id', id)
        .select('id, stock')
        .single()
      if (error || !data) throw new Error('Update rejected')
      setSavedStock(data.stock)
      setValue(String(data.stock))
      setMessage('تم حفظ المخزون.')
      router.refresh()
    } catch {
      setFailed(true)
      setMessage('تعذر حفظ المخزون. تحققي من الاتصال والصلاحيات ثم حاولي مجددًا.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`stock-${id}`} className="sr-only">مخزون {label}</label>
        <input
          id={`stock-${id}`}
          type="number"
          min={0}
          max={2147483647}
          step={1}
          required
          value={value}
          disabled={busy}
          onChange={(event) => { setValue(event.target.value); setMessage('') }}
          aria-invalid={!valid}
          className="min-h-11 w-24 rounded-lg border border-[#617A55]/25 bg-[#F7F6F0] px-3 text-center outline-none focus:border-[#617A55]"
        />
        <button type="submit" disabled={busy || !valid || number === savedStock} className="min-h-11 rounded-lg bg-[#617A55] px-4 text-sm font-semibold text-[#F7F6F0] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? 'جارٍ الحفظ...' : 'حفظ'}
        </button>
      </div>
      {!valid && <p className="mt-1 text-sm text-[#617A55]">المخزون يجب أن يكون عددًا صحيحًا غير سالب.</p>}
      {message && <p role={failed ? 'alert' : 'status'} className="mt-1 text-sm leading-6 text-[#617A55]">{message}</p>}
    </form>
  )
}

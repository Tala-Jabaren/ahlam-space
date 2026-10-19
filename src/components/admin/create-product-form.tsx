'use client'

import Image from 'next/image'
import { ImagePlus, Plus, Save, Trash2, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { MAX_PRODUCT_IMAGE_BYTES, PRODUCT_IMAGE_TYPES } from './product-input'

type Variant = { key: number; size: string; color: string; sku: string; stock: string }
const initialVariant = (): Variant => ({ key: 0, size: '', color: '', sku: '', stock: '0' })
const inputStyle = 'mt-2 min-h-11 w-full min-w-0 rounded-lg border border-[#617A55]/25 bg-[#F7F6F0] px-3 py-2 text-sm text-[#25311f] outline-none focus:ring-2 focus:ring-[#617A55]'
const secondary = 'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#617A55]/25 px-4 py-2 text-sm font-medium text-[#617A55] transition hover:bg-[#D6E2B6]/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55] disabled:cursor-not-allowed disabled:opacity-50'

export default function CreateProductForm() {
  const router = useRouter()
  const formId = useId()
  const toggleRef = useRef<HTMLButtonElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const requestId = useRef('')
  const nextKey = useRef(1)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [variants, setVariants] = useState<Variant[]>([initialVariant()])
  const [preview, setPreview] = useState<string | null>(null)
  const [imageError, setImageError] = useState('')
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
  useEffect(() => {
    if (!open && !busy && message) toggleRef.current?.focus()
  }, [open, busy, message])

  function reset() {
    setVariants([initialVariant()])
    nextKey.current = 1
    requestId.current = ''
    setPreview(null)
    setImageError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  function close() {
    if (busy) return
    setOpen(false)
    reset()
    toggleRef.current?.focus()
  }

  function chooseImage() {
    const file = fileRef.current?.files?.[0]
    setPreview(null)
    setImageError('')
    if (!file) return
    if (!PRODUCT_IMAGE_TYPES.includes(file.type) || file.size > MAX_PRODUCT_IMAGE_BYTES) {
      setImageError('اختاري صورة JPG أو PNG أو WebP لا يتجاوز حجمها 5 ميغابايت.')
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    setPreview(URL.createObjectURL(file))
  }

  function updateVariant(key: number, field: keyof Omit<Variant, 'key'>, value: string) {
    setVariants(current => current.map(variant => variant.key === key ? { ...variant, [field]: value } : variant))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || imageError) return
    const body = new FormData(event.currentTarget)
    if (!requestId.current) requestId.current = crypto.randomUUID()
    body.set('product_id', requestId.current)
    body.set('variants', JSON.stringify(variants.map(({ size, color, sku, stock }) => ({ size, color, sku, stock: Number(stock) }))))
    setBusy(true)
    setMessage('')
    setFailed(false)
    try {
      const response = await fetch('/admin/products/create', { method: 'POST', body })
      const result = await response.json()
      if (!response.ok) {
        setFailed(true)
        setMessage(result.error || 'تعذر إضافة المنتج. حاولي مجددًا.')
        router.refresh()
        return
      }
      setMessage(result.message)
      setOpen(false)
      reset()
      router.refresh()
      toggleRef.current?.focus()
    } catch {
      setFailed(true)
      setMessage('تعذر إكمال الإضافة. تحققي من قائمة المنتجات قبل إعادة الإرسال.')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return <section className="mt-6">
    <button
      ref={toggleRef}
      type="button"
      aria-expanded={open}
      aria-controls={formId}
      disabled={busy}
      onClick={() => { if (open) close(); else { setOpen(true); setMessage('') } }}
      className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-[#617A55] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#617A55]/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55] disabled:opacity-50"
    >
      {open ? <X size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
      {open ? 'إغلاق النموذج' : 'إضافة منتج جديد'}
    </button>

    <div id={formId} hidden={!open}>
      {open && <form
        onSubmit={submit}
        onKeyDown={event => { if (event.key === 'Escape' && !busy) { event.preventDefault(); close() } }}
        className="mt-4 rounded-lg border border-[#617A55]/15 bg-white p-5 sm:p-7"
      >
        <h2 className="text-xl font-semibold text-[#617A55]">منتج جديد</h2>
        <fieldset disabled={busy} className="mt-5 min-w-0 space-y-6 disabled:opacity-70">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <label className="min-w-0 text-sm font-medium text-[#617A55] sm:col-span-2">اسم المنتج
                <input name="name" autoFocus required maxLength={200} className={inputStyle} />
              </label>
              <label className="min-w-0 text-sm font-medium text-[#617A55]">السعر (₪)
                <input name="price" type="number" min="0" max="99999999.99" step="0.01" inputMode="decimal" required className={inputStyle} />
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 self-end text-sm font-medium text-[#617A55]">
                <input name="is_active" type="checkbox" defaultChecked className="size-5 accent-[#617A55]" />
                ظاهر في المتجر
              </label>
              <label className="min-w-0 text-sm font-medium text-[#617A55] sm:col-span-2">وصف المنتج
                <textarea name="description" rows={3} maxLength={3000} className={inputStyle} />
              </label>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#617A55]">صورة المنتج (اختياري)</p>
              {preview && <div className="relative mt-2 aspect-[4/3] overflow-hidden rounded-lg bg-[#F7F6F0]">
                <Image src={preview} alt="معاينة صورة المنتج الجديد" fill unoptimized className="object-cover" sizes="260px" />
              </div>}
              <input ref={fileRef} id={`${formId}-image`} name="image" type="file" accept={PRODUCT_IMAGE_TYPES.join(',')} onChange={chooseImage} className="sr-only" tabIndex={-1} aria-label="صورة المنتج" aria-describedby={`${formId}-image-help`} />
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => fileRef.current?.click()} className={secondary}><ImagePlus size={18} aria-hidden="true" />{preview ? 'تغيير الصورة' : 'اختيار صورة'}</button>
                {(preview || imageError) && <button type="button" aria-label="إزالة الصورة" title="إزالة الصورة" className={secondary} onClick={() => { setPreview(null); setImageError(''); if (fileRef.current) fileRef.current.value = '' }}><X size={18} aria-hidden="true" /></button>}
              </div>
              <p id={`${formId}-image-help`} className="mt-2 text-xs text-[#617A55]">JPG، PNG، WebP · حتى 5 ميغابايت</p>
              {imageError && <p role="alert" className="mt-2 text-sm leading-6 text-[#617A55]">{imageError}</p>}
            </div>
          </div>

          <div className="border-t border-[#617A55]/15 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold text-[#617A55]">خيارات المنتج والمخزون</h3>
              <button type="button" disabled={variants.length >= 30} onClick={() => setVariants(current => [...current, { ...initialVariant(), key: nextKey.current++ }])} className={secondary}><Plus size={16} aria-hidden="true" />إضافة خيار</button>
            </div>
            <div className="mt-3 divide-y divide-[#617A55]/10">
              {variants.map((variant, index) => <div key={variant.key} role="group" aria-label={`الخيار ${index + 1}`} className="grid items-end gap-3 py-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_100px_1.3fr_44px]">
                <label className="min-w-0 text-sm text-[#617A55]">المقاس (اختياري)<input value={variant.size} maxLength={80} onChange={event => updateVariant(variant.key, 'size', event.target.value)} className={inputStyle} /></label>
                <label className="min-w-0 text-sm text-[#617A55]">اللون (اختياري)<input value={variant.color} maxLength={80} onChange={event => updateVariant(variant.key, 'color', event.target.value)} className={inputStyle} /></label>
                <label className="min-w-0 text-sm text-[#617A55]">المخزون<input type="number" min="0" max="2147483647" step="1" required value={variant.stock} onChange={event => updateVariant(variant.key, 'stock', event.target.value)} className={inputStyle} /></label>
                <label className="min-w-0 text-sm text-[#617A55]">SKU (اختياري)<input value={variant.sku} maxLength={100} onChange={event => updateVariant(variant.key, 'sku', event.target.value)} className={inputStyle} /></label>
                <button type="button" disabled={variants.length === 1} aria-label={`حذف الخيار ${index + 1}`} title="حذف الخيار" onClick={() => setVariants(current => current.filter(item => item.key !== variant.key))} className="grid size-11 cursor-pointer place-items-center rounded-lg border border-[#617A55]/25 text-[#617A55] hover:bg-[#D6E2B6]/40 focus-visible:outline-2 focus-visible:outline-[#617A55] disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={18} aria-hidden="true" /></button>
              </div>)}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={Boolean(imageError)} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-[#617A55] px-5 py-3 text-sm font-semibold text-white hover:bg-[#617A55]/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55] disabled:cursor-not-allowed disabled:opacity-50"><Save size={18} aria-hidden="true" />{busy ? 'جارٍ حفظ المنتج...' : 'حفظ المنتج'}</button>
            <button type="button" onClick={close} className={secondary}>إلغاء</button>
          </div>
        </fieldset>
        {message && <p role={failed ? 'alert' : 'status'} className="mt-4 rounded-lg bg-[#C7D6E8]/40 p-4 text-sm leading-6 text-[#617A55]">{message}</p>}
      </form>}
    </div>
    {!open && message && <p role={failed ? 'alert' : 'status'} className="mt-4 rounded-lg bg-[#D6E2B6]/40 p-4 text-sm leading-6 text-[#617A55]">{message}</p>}
  </section>
}

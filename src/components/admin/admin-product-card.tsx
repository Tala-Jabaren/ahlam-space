'use client'

import Image from 'next/image'
import AdminDeleteButton from './admin-delete-button'
import { useState } from 'react'
import { ProductActiveToggle, VariantStockEditor } from './product-controls'

export type AdminProduct = {
  id: string
  name: string
  price: number
  image_url: string | null
  is_active: boolean | null
  product_variants: Array<{ id: string; size: string | null; color: string | null; sku: string | null; stock: number }>
}

export default function AdminProductCard({ product }: { product: AdminProduct }) {
  const [deleted, setDeleted] = useState(false)
  if (deleted) return null
  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-[#617A55]/15 bg-white">
      <header className="flex items-start gap-4 border-b border-[#617A55]/10 p-4 sm:p-5">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-[#D6E2B6]/40">
          {product.image_url ? <Image src={product.image_url} alt={product.name} fill unoptimized sizes="96px" className="object-cover" /> : <span className="grid h-full place-items-center px-2 text-center text-xs text-[#617A55]">بدون صورة</span>}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-xl font-semibold text-[#617A55]">{product.name}</h2>
          <p className="mt-1 text-sm text-[#617A55]">{new Intl.NumberFormat('ar').format(product.price)} ₪</p>
          <ProductActiveToggle id={product.id} name={product.name} active={product.is_active === true} onDeleted={() => setDeleted(true)} />
        </div>
      </header>
      <div className="p-4 sm:p-5">
        <h3 className="mb-3 text-sm font-semibold text-[#617A55]">مخزون الخيارات</h3>
        {!product.product_variants.length && <p className="text-sm text-[#617A55]">لا توجد خيارات لهذا المنتج.</p>}
        <ul className="divide-y divide-[#617A55]/15">
          {product.product_variants.map((variant) => {
            const label = [variant.size, variant.color].filter(Boolean).join(' / ') || 'الخيار الأساسي'
            return (
              <li key={variant.id} className="flex flex-col gap-3 py-3 first:pt-0 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 text-sm text-[#617A55]">
                  <p className="break-words font-medium">{label}</p>
                  {variant.sku && <p className="mt-1 break-all text-xs" dir="ltr">{variant.sku}</p>}
                </div>
                <div className="flex flex-wrap items-start gap-2"><VariantStockEditor id={variant.id} stock={variant.stock} label={`${product.name} / ${label}`} /><AdminDeleteButton kind="variant" id={variant.id} label={`خيار ${product.name} / ${label}`} /></div>
              </li>
            )
          })}
        </ul>
      </div>
    </article>
  )
}

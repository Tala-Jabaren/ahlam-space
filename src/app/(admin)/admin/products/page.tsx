import Image from 'next/image'
import { getAdminSession } from '@/components/admin/admin-session'
import { ProductActiveToggle, VariantStockEditor } from '@/components/admin/product-controls'

type Product = {
  id: string
  name: string
  price: number
  image_url: string | null
  is_active: boolean | null
  product_variants: Array<{ id: string; size: string | null; color: string | null; sku: string | null; stock: number }>
}

export default async function AdminProductsPage() {
  const supabase = await getAdminSession()
  const { data, error } = await supabase
    .from('products')
    .select('id, name, price, image_url, is_active, product_variants(id, size, color, sku, stock)')
    .order('name', { ascending: true })
    .returns<Product[]>()

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="border-b border-[#617A55]/15 pb-6">
        <h1 className="font-serif text-3xl text-[#617A55] sm:text-4xl">المنتجات</h1>
        <p className="mt-3 leading-7 text-[#617A55]">إدارة ظهور المنتجات وكميات المخزون.</p>
      </header>
      {error && <p role="alert" className="mt-6 rounded-lg bg-[#C7D6E8]/50 p-5 text-[#617A55]">تعذر تحميل المنتجات. تحققي من الاتصال وصلاحيات عرض المنتجات.</p>}
      {!error && !data?.length && <p className="mt-6 bg-[#D6E2B6]/40 p-6 text-[#617A55]">لا توجد منتجات بعد.</p>}
      {!error && data && (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {data.map((product) => (
            <article key={product.id} className="min-w-0 overflow-hidden rounded-lg border border-[#617A55]/15 bg-white">
              <header className="flex items-start gap-4 border-b border-[#617A55]/10 p-4 sm:p-5">
                <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-[#D6E2B6]/40">
                  {product.image_url ? <Image src={product.image_url} alt={product.name} fill unoptimized sizes="96px" className="object-cover" /> : <span className="grid h-full place-items-center px-2 text-center text-xs text-[#617A55]">بدون صورة</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="break-words text-xl font-semibold text-[#617A55]">{product.name}</h2>
                  <p className="mt-1 text-sm text-[#617A55]">{new Intl.NumberFormat('ar').format(product.price)} ₪</p>
                  <ProductActiveToggle id={product.id} active={product.is_active === true} />
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
                        <VariantStockEditor id={variant.id} stock={variant.stock} label={`${product.name} / ${label}`} />
                      </li>
                    )
                  })}
                </ul>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}

import { getAdminSession } from '@/components/admin/admin-session'
import AdminProductCard, { type AdminProduct } from '@/components/admin/admin-product-card'
import CreateProductForm from '@/components/admin/create-product-form'

export default async function ProductsContent() {
  const supabase = await getAdminSession()
  const { data, error } = await supabase
    .from('products')
    .select('id, name, price, image_url, is_active, product_variants(id, size, color, sku, stock)')
    .order('name', { ascending: true })
    .returns<AdminProduct[]>()

  return (
    <section>
      <header className="border-b border-[#617A55]/15 pb-6">
        <h2 className="font-serif text-3xl text-[#617A55] sm:text-4xl">المنتجات</h2>
        <p className="mt-3 leading-7 text-[#617A55]">إدارة ظهور المنتجات وكميات المخزون.</p>
      </header>
      <CreateProductForm />
      {error && <p role="alert" className="mt-6 rounded-lg bg-[#C7D6E8]/50 p-5 text-[#617A55]">تعذر تحميل المنتجات. تحققي من الاتصال وصلاحيات عرض المنتجات.</p>}
      {!error && !data?.length && <p className="mt-6 bg-[#D6E2B6]/40 p-6 text-[#617A55]">لا توجد منتجات بعد.</p>}
      {!error && data && (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {data.map((product) => (
            <AdminProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  )
}

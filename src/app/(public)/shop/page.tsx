import { createClient } from '@/lib/supabase/server'
import ShopGrid, { type ShopProduct } from './shop-grid'

export default async function ShopPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select('id, name, description, price, product_variants(id, size, color, stock)')
    .eq('is_active', true)
    .order('name', { ascending: true })

  const products = (data ?? []) as ShopProduct[]

  return (
    <div dir="rtl">
      <section className="px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
        <div className="mx-auto grid max-w-7xl items-center gap-8 overflow-hidden rounded-[2rem] border border-[#617A55]/10 bg-white/70 lg:grid-cols-2">
          <div className="relative isolate aspect-[16/11] overflow-hidden bg-gradient-to-br from-[#D6E2B6] via-[#F7F6F0] to-[#C7D6E8] lg:aspect-auto lg:h-full lg:min-h-[22rem]">
            <div
              aria-hidden="true"
              className="absolute -left-10 -top-10 size-52 rounded-full bg-[#617A55]/10 blur-2xl"
            />
            <div
              aria-hidden="true"
              className="absolute bottom-6 right-10 size-28 rounded-full bg-white/50 blur-xl"
            />
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-10 flex justify-center"
            >
              <span className="block h-20 w-12 -rotate-6 rounded-[100%_0_100%_0] bg-[#617A55]/20" />
              <span className="-ml-2 mt-10 block h-14 w-8 rotate-6 rounded-[0_100%_0_100%] bg-[#617A55]/10" />
            </div>
          </div>

          <div className="space-y-5 px-6 py-8 sm:px-10 sm:py-10 lg:py-12">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#617A55]">
              AHLAM SHOP
            </p>
            <h1 className="font-serif text-4xl leading-tight text-[#25311f] sm:text-5xl">
              أشياء صغيرة، صُنعت بعناية.
            </h1>
            <p className="text-base leading-8 text-[#4f5d49] sm:text-lg">
              من زُلفة ومساحة أحلام، اختيارات تضيف ليومك دفئًا، توازنًا
              ولحظات أهدأ.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:px-10">
        {error && (
          <div className="rounded-[1.5rem] bg-[#C7D6E8]/55 p-8 text-center text-[#4f5d49]">
            تعذر تحميل المنتجات الآن.
          </div>
        )}
        {!error && <ShopGrid products={products} />}
      </section>
    </div>
  )
}

import { getAdminSession } from '@/components/admin/admin-session'
import CatalogEditor, { type ClassRecord } from '@/components/admin/catalog-editor'

const categories: Record<string, string> = { yoga: 'يوغا', fitness: 'لياقة', dance: 'رقص' }

export default async function AdminClassesPage() {
  const supabase = await getAdminSession()
  const { data, error } = await supabase.from('classes').select('id, name, description, category, is_active, duration_minutes').order('name').returns<ClassRecord[]>()
  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <h1 className="border-b border-[#617A55]/15 pb-6 font-serif text-3xl text-[#617A55]">الحصص</h1>
    {error ? <p role="alert" className="mt-6 rounded-lg bg-[#C7D6E8]/50 p-5">تعذر تحميل الحصص. تحققي من صلاحيات العرض والاتصال.</p> : !data?.length ? <p className="mt-6 p-5">لا توجد حصص بعد.</p> : <div className="mt-6 grid gap-5 lg:grid-cols-2">{data.map(item => <article key={item.id} className="min-w-0 rounded-lg border border-[#617A55]/15 bg-white p-5"><h2 className="break-words text-xl font-semibold text-[#617A55]">{item.name}</h2><p className="my-2 text-sm text-[#617A55]">{categories[item.category || ''] || 'بدون فئة'} · {item.is_active ? 'نشطة' : 'غير نشطة'}</p><p className="mb-4 whitespace-pre-wrap break-words text-sm leading-7">{item.description}</p><CatalogEditor kind="class" record={item} /></article>)}</div>}
  </main>
}

import AdminDeleteButton from '@/components/admin/admin-delete-button'
import { getAdminSession } from '@/components/admin/admin-session'
import CatalogEditor, { type CourseRecord } from '@/components/admin/catalog-editor'

export default async function AdminCoursesPage() {
  const supabase = await getAdminSession()
  const { data, error } = await supabase.from('courses').select('id, title, description, price, content_type, video_url, article_body, is_active').order('created_at', { ascending: false }).returns<CourseRecord[]>()
  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#617A55]/15 pb-6"><h1 className="font-serif text-3xl text-[#617A55]">الكورسات</h1></header>
    <section aria-label="كورس جديد" className="py-6"><CatalogEditor kind="course" /></section>
    {error ? <p role="alert" className="rounded-lg bg-[#C7D6E8]/50 p-5">تعذر تحميل الكورسات. تحققي من صلاحيات العرض والاتصال.</p> : !data?.length ? <p className="p-5">لا توجد كورسات بعد.</p> : <div className="grid gap-5 lg:grid-cols-2">{data.map(item => <article key={item.id} className="min-w-0 rounded-lg border border-[#617A55]/15 bg-white p-5"><header className="flex items-start justify-between gap-3"><h2 className="min-w-0 break-words text-xl font-semibold text-[#617A55]">{item.title}</h2><AdminDeleteButton kind="course" id={item.id} label={item.title} /></header><p className="my-2 text-sm text-[#617A55]">{new Intl.NumberFormat('ar').format(item.price)} ₪ · {item.content_type === 'video' ? 'فيديو' : 'مقال'} · {item.is_active ? 'نشط' : 'غير نشط'}</p><p className="mb-4 whitespace-pre-wrap break-words text-sm leading-7">{item.description}</p><CatalogEditor kind="course" record={item} /></article>)}</div>}
  </main>
}

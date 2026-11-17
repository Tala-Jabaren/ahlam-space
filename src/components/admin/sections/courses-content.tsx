import AdminDeleteButton from '@/components/admin/admin-delete-button'
import { getAdminSession } from '@/components/admin/admin-session'
import CatalogEditor, { type CourseRecord } from '@/components/admin/catalog-editor'
import { meditationsAr } from '@/i18n/meditations'

export default async function CoursesContent() {
  const supabase = await getAdminSession()
  const { data, error } = await supabase.from('courses').select('id, title, description, price, content_type, video_url, article_body, is_active, cover_image_url').order('created_at', { ascending: false }).returns<Omit<CourseRecord, 'audio_path' | 'duration_minutes'>[]>()
  const paths = new Map<string, string | null>()
  const durations = new Map<string, number | null>()
  let pathError = false
  for (const course of data ?? []) {
    if (course.content_type !== 'audio') continue
    const result = await supabase.rpc('get_meditation_audio_path', { p_course_id: course.id })
    const duration = await supabase.from('courses').select('duration_minutes').eq('id', course.id).maybeSingle()
    if (result.error || duration.error) pathError = true
    else {
      paths.set(course.id, typeof result.data === 'string' ? result.data : null)
      durations.set(course.id, duration.data?.duration_minutes ?? null)
    }
  }
  return <section>
    <h2 className="sr-only">المحتوى</h2>
    <section aria-label="كورس جديد" className="py-6"><CatalogEditor kind="course" /></section>
    {pathError && <p role="alert" className="mb-4 rounded-lg bg-[#C7D6E8]/50 p-5">{meditationsAr.adminPathLoadError}</p>}
    {error ? <p role="alert" className="rounded-lg bg-[#C7D6E8]/50 p-5">تعذر تحميل الكورسات. تحققي من صلاحيات العرض والاتصال.</p> : !data?.length ? <p className="p-5">لا توجد كورسات بعد.</p> : <div className="grid gap-5 lg:grid-cols-2">{data.map(item => <article key={item.id} className="min-w-0 rounded-lg border border-[#617A55]/15 bg-white p-5"><header className="flex items-start justify-between gap-3">{item.cover_image_url && (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.cover_image_url} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
    )}<h2 className="min-w-0 flex-1 break-words text-xl font-semibold text-[#617A55]">{item.title}</h2><AdminDeleteButton kind="course" id={item.id} label={item.title} /></header><p className="my-2 text-sm text-[#617A55]">{new Intl.NumberFormat('ar').format(item.price)} ₪ · {item.content_type === 'audio' ? meditationsAr.adminAudio : item.content_type === 'video' ? 'فيديو' : 'مقال'} · {item.is_active ? 'نشط' : 'غير نشط'}</p><p className="mb-4 whitespace-pre-wrap break-words text-sm leading-7">{item.description}</p>{(item.content_type !== 'audio' || paths.has(item.id)) && <CatalogEditor kind="course" record={{ ...item, audio_path: paths.get(item.id) ?? null, duration_minutes: durations.get(item.id) ?? null }} />}</article>)}</div>}
  </section>
}

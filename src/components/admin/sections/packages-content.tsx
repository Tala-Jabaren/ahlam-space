import { getAdminSession } from '@/components/admin/admin-session'
import CreatePackageForm from '@/components/admin/create-package-form'
import PackageEditor from '@/components/admin/package-editor'
import type { Tables } from '@/types/database'

export default async function PackagesContent() {
  const supabase = await getAdminSession()

  const { data: packages, error } = await supabase
    .from('class_packages')
    .select('id, name, description, sessions_count, price, validity_days, is_active, sort_order, image_url, created_at')
    .order('sort_order', { ascending: true })
    .returns<Tables<'class_packages'>[]>()

  return (
    <div>
      <CreatePackageForm />
      {error ? (
        <p role="alert" className="rounded-lg bg-[#C7D6E8]/50 p-5">تعذر تحميل الباقات. تحققي من صلاحيات العرض والاتصال.</p>
      ) : !packages?.length ? (
        <p className="p-5">لا توجد باقات بعد.</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {packages.map(item => (
            <article key={item.id} className="min-w-0 rounded-lg border border-[#617A55]/15 bg-white p-5">
              <header className="flex items-start justify-between gap-3">
                <h2 className="min-w-0 break-words text-xl font-semibold text-[#617A55]">{item.name}</h2>
                <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${item.is_active ? 'bg-[#D6E2B6]/70 text-[#3f5233]' : 'bg-[#617A55]/10 text-[#617A55]/70'}`}>
                  {item.is_active ? 'نشطة' : 'غير نشطة'}
                </span>
              </header>
              <p className="mt-2 text-sm text-[#617A55]/80">
                <bdi>{item.sessions_count} حصص · ₪{item.price}{item.validity_days != null ? ` · صالحة ${item.validity_days} يوم` : ''}</bdi>
              </p>
              {item.description && (
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{item.description}</p>
              )}
              <div className="mt-4"><PackageEditor record={item} /></div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

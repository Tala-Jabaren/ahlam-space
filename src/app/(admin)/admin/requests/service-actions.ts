'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSession } from '@/components/admin/admin-session'
import { privateSessionImages } from '@/lib/private-session-services'

const service = z.object({
  title_ar: z.string().trim().min(1).max(120),
  title_en: z.string().trim().max(120),
  description_ar: z.string().trim().min(1).max(3000),
  description_en: z.string().trim().max(3000),
  image: z.enum(privateSessionImages.map(({ path }) => path)),
  price: z.union([z.literal(''), z.string().regex(/^\d{1,8}(\.\d{1,2})?$/)]),
  hourly: z.literal('on').optional(),
  duration_ar: z.string().trim().max(150),
  duration_en: z.string().trim().max(150),
})

export async function savePrivateSession(id: number | null, form: FormData) {
  const supabase = await getAdminSession()
  const result = service.safeParse(Object.fromEntries(form))
  if (!result.success || (id !== null && (!Number.isSafeInteger(id) || id < 1))) {
    return { error: 'تحققي من الاسم والوصف والصورة والسعر، ثم حاولي مرة أخرى.' }
  }

  const input = result.data
  const row = {
    ...input,
    title_en: input.title_en || null,
    description_en: input.description_en || null,
    price: input.price === '' ? null : Number(input.price),
    hourly: input.price !== '' && input.hourly === 'on',
    duration_ar: input.duration_ar || null,
    duration_en: input.duration_en || null,
  }
  const table = supabase.from('private_session_services')
  const query = id === null ? table.insert(row) : table.update(row).eq('id', id)
  const { error } = await query.select('id').single()
  if (error) return { error: 'تعذّر حفظ الجلسة. حاولي مرة أخرى.' }

  revalidatePath('/admin/requests')
  revalidatePath('/private-sessions')
  return { error: '' }
}

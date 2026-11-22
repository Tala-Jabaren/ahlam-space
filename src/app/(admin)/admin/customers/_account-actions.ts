'use server'

import { revalidatePath } from 'next/cache'
import { getAdminSession } from '@/components/admin/admin-session'
import { getCustomerAccountState } from '@/lib/admin-customers'
import { createAdminClient } from '@/lib/supabase/admin'

export async function changeCustomerAccount(userId: string, change: 'disable' | 'enable' | 'delete') {
  const supabase = await getAdminSession()
  if (typeof userId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return { ok: false, message: 'الحساب المحدّد غير صالح.' }
  }
  if (change !== 'disable' && change !== 'enable' && change !== 'delete') {
    return { ok: false, message: 'الإجراء غير صالح.' }
  }

  try {
    const state = await getCustomerAccountState(supabase, userId)
    if (!state) return { ok: false, message: 'الحساب غير متاح لهذا الإجراء.' }
    if (change === 'delete' || (change === 'disable') !== (state === 'disabled')) {
      const auth = createAdminClient().auth.admin
      const { error } = change === 'delete'
        ? await auth.deleteUser(userId, true)
        : await auth.updateUserById(userId, { ban_duration: change === 'disable' ? '876000h' : 'none' })
      if (error) throw error
    }
  } catch (error) {
    console.error('Customer account operation failed:', error)
    return { ok: false, message: 'تعذّر تعديل الحساب. حدّثي القائمة وحاولي مرة أخرى.' }
  }

  revalidatePath('/admin/customers')
  revalidatePath(`/admin/customers/${userId}`)
  return { ok: true, message: '' }
}

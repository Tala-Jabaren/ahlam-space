import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getCustomers,
  getGuestBuyers,
  type CustomerSort,
  type CustomerTab,
} from '@/lib/admin-customers'
import { buildCsv, buildDocx, guestColumns, titleFor, usersColumns } from '@/lib/customers-export'

// docx's Packer.toBuffer needs Node's Buffer/zlib - this route must run on
// the Node runtime, not Edge.
export const runtime = 'nodejs'

function isTab(value: string | null): value is CustomerTab {
  return value === 'users' || value === 'guests'
}

function isSort(value: string | null): value is CustomerSort {
  return value === 'registered_desc' || value === 'registered_asc' || value === 'spent_desc'
}

function todayInJerusalem() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response(null, { status: 403 })
  }

  // Server-side admin check, same underlying query as
  // src/components/admin/admin-session.ts's getAdminSession() - that
  // helper redirects, which isn't right for a download endpoint, so this
  // repeats its check and returns 403 instead.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') {
    return new Response(null, { status: 403 })
  }

  const searchParams = request.nextUrl.searchParams
  const format = searchParams.get('format')

  if (format !== 'docx' && format !== 'csv') {
    return new Response('Invalid format', { status: 400 })
  }

  const tab: CustomerTab = isTab(searchParams.get('tab')) ? (searchParams.get('tab') as CustomerTab) : 'users'
  const sort: CustomerSort = isSort(searchParams.get('sort'))
    ? (searchParams.get('sort') as CustomerSort)
    : 'registered_desc'
  const q = searchParams.get('q') ?? ''

  try {
    // pageSize: 0 means "return all rows matching q" (see
    // src/lib/admin-customers.ts) - the export is never limited to one page.
    const query = { q, sort, pageSize: 0 }
    const filename = `ahlam-space-customers-${todayInJerusalem()}.${format}`
    const isCsv = format === 'csv'

    let body: Buffer
    const contentType = isCsv
      ? 'text/csv; charset=utf-8'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

    if (tab === 'users') {
      const { rows } = await getCustomers(supabase, query)
      body = isCsv ? buildCsv(usersColumns(), rows) : await buildDocx(titleFor('users'), usersColumns(), rows)
    } else {
      const { rows } = await getGuestBuyers(supabase, query)
      body = isCsv ? buildCsv(guestColumns(), rows) : await buildDocx(titleFor('guests'), guestColumns(), rows)
    }

    return new Response(new Uint8Array(body), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    // Never log personal data: no row contents, no search query, no
    // forwarded error details - just a flat message.
    console.error('Admin customers export failed.')
    return new Response('Export failed', { status: 500 })
  }
}

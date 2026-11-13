import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import assert from 'node:assert/strict'
const main = file => execFileSync('git', ['show', `origin/main:${file}`], { encoding: 'utf8' })
const current = file => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
function section(text, start, end) {
  const first = text.indexOf(start)
  const last = text.indexOf(end, first)
  assert(first >= 0 && last > first, `Missing contract section: ${start}`)
  return text.slice(first, last)
}

const oldCheckout = main('src/app/(public)/checkout/checkout-form.tsx').replace(/\r\n/g, '\n')
const checkout = current('src/components/commerce/checkout-form.tsx')
assert.equal(section(checkout, "      const { data, error: orderError } = await supabase.rpc('place_order'", '\n      if (orderError)'), section(oldCheckout, "      const { data, error: orderError } = await supabase.rpc('place_order'", '\n      if (orderError)'))
assert.equal(section(checkout, '      const {\n        data: { user },', '      const rpcItems'), section(oldCheckout, '      const {\n        data: { user },', '      const rpcItems'))

const oldDetail = main('src/app/(public)/courses/[id]/page.tsx').replace(/\r\n/g, '\n')
const detail = current('src/components/commerce/course-detail.tsx')
assert.equal(section(detail, '  const audioState:', '\n  return ('), section(oldDetail, '  const audioState:', '\n  return ('))
assert(detail.includes("if (!audio && !paid) redirect(`${routes.courses}?error=access_denied`)"))

const oldPurchase = main('src/app/(public)/courses/purchase-course-button.tsx').replace(/\r\n/g, '\n')
const purchase = current('src/app/(public)/courses/purchase-course-button.tsx')
assert.equal(section(purchase, "      .from('course_purchases')", '\n    if (error)'), section(oldPurchase, "      .from('course_purchases')", '\n    if (error)'))

const member = current('src/app/(member)/layout.tsx')
const oldMember = main('src/app/(member)/layout.tsx').replace(/\r\n/g, '\n')
assert.equal(section(member, '  const supabase =', '  const fullName ='), section(oldMember, '  const supabase =', '  const fullName ='))

const protectedFiles = ['src/app/(public)/page.tsx', 'src/components/home', 'src/app/globals.css', 'src/app/(public)/site-header.tsx', 'src/app/(public)/layout.tsx', 'src/content/site-contact.ts', 'src/app/(public)/contact', 'src/app/(member)/trips', 'src/components/trips', 'src/lib/trips.ts', 'src/app/(admin)/admin/trips', 'src/app/api/cron', 'src/lib/cron-auth.ts', 'vercel.json', 'supabase']
execFileSync('git', ['diff', '--exit-code', 'origin/main', '--', ...protectedFiles], { stdio: 'pipe' })
console.log('PASS source contracts: unchanged checkout RPC/auth, purchase insert, paid/expiry/signing logic, member auth guard and protected paths')

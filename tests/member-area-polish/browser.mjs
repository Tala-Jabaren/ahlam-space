import path from 'node:path'
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import sharp from 'sharp'

const loadModule = createRequire(import.meta.url)
const { chromium } = loadModule(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.APP_URL || 'http://localhost:3020'
const baseline = process.env.BASELINE_URL || 'http://localhost:3021'
const api = `http://127.0.0.1:${process.env.FIXTURE_PORT || 4342}`
const output = path.resolve(process.env.SCREENSHOT_DIR || 'docs/member-area-polish/screenshots')
const video = '11111111-1111-4111-8111-111111111111'
const article = '22222222-2222-4222-8222-222222222222'
const audio = '44444444-4444-4444-8444-444444444444'
const product = '55555555-5555-4555-8555-555555555555'
const variant = '66666666-6666-4666-8666-666666666666'
const privateText = 'وقت لنفسك، وعودة هادئة إلى التوازن.'
const configure = async value => {
  await fetch(`${api}/test/config`, { method: 'POST', body: JSON.stringify(value) })
}

async function ready(page) {
  await page.locator('h1:visible').first().waitFor()
  await page.waitForLoadState('networkidle')
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].map(image => image.decode().catch(() => {})))
  })
  if (await page.locator('.stat-value').count()) {
    await page.waitForTimeout(1200)
    const counters = await page.locator('.stat-value:visible').allTextContents()
    console.log('Hydrated counters:', page.url(), counters.join(', '))
  }
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' })
}
async function screenshot(page, name) {
  await ready(page)
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Body overflow: ${name}`)
  return page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true, animations: 'disabled' })
}
async function memberChrome(page, width) {
  const nav = page.getByRole('navigation', { name: width < 768 ? 'تنقل الجوال' : 'تنقل حساب العضو', exact: true })
  await nav.waitFor()
  assert.equal(await page.locator('.site-header').count(), 0, 'Public header leaked into member area')
  return nav
}

;(async () => {
  await fs.mkdir(output, { recursive: true })
  await configure({ purchase: 'paid', orders: true, role: 'admin' })
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  for (const width of [390, 1280]) {
    const beforePage = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })
    await beforePage.goto(`${baseline}/`, { waitUntil: 'networkidle' })
    console.log(`Comparing home ${width}: main`)
    const before = await screenshot(beforePage, `home-main-${width}`)
    await beforePage.close()
    const afterPage = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })
    await afterPage.goto(`${base}/`, { waitUntil: 'networkidle' })
    console.log(`Comparing home ${width}: branch`)
    const after = await screenshot(afterPage, `home-branch-${width}`)
    await afterPage.close()
    const a = await sharp(before).raw().toBuffer({ resolveWithObject: true })
    const b = await sharp(after).raw().toBuffer({ resolveWithObject: true })
    assert.deepEqual(a.info, b.info, 'Home dimensions changed')
    let maxDelta = 0
    for (let index = 0; index < a.data.length; index++) maxDelta = Math.max(maxDelta, Math.abs(a.data[index] - b.data[index]))
    // Permit only one channel level of rasterization rounding, not layout changes.
    assert(maxDelta <= 1, `Home pixels differ at ${width}px (max channel delta ${maxDelta})`)
  }
  console.log('PASS / visually unchanged from main at 390px and 1280px (maximum channel tolerance 1/255)')

  await page.goto(`${base}/login?returnTo=%2Fmember%2Fcourses`)
  await page.locator('input[type=email]').fill('member@example.test')
  await page.locator('input[type=password]').fill('fixture-password')
  await page.locator('button[type=submit]').click()
  await page.waitForURL(`${base}/member/courses`)

  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(`${base}/member/courses`)
    let nav = await memberChrome(page, width)
    await screenshot(page, `member-courses-${width}`)
    const lecture = page.locator('article').filter({ hasText: 'العودة إلى التوازن' })
    await lecture.getByRole('link').click()
    await page.waitForURL(`${base}/member/courses/${article}`)
    await memberChrome(page, width)
    await page.getByText(privateText, { exact: true }).waitFor()
    await screenshot(page, `member-course-detail-${width}`)

    nav = await memberChrome(page, width)
    await nav.getByRole('link', { name: 'المتجر', exact: true }).click()
    await page.waitForURL(`${base}/member/shop`)
    await memberChrome(page, width)
    await screenshot(page, `member-shop-${width}`)
    await page.getByRole('link', { name: 'شمعة سكون', exact: true }).click()
    await page.waitForURL(`${base}/member/shop/${product}`)
    await memberChrome(page, width)
    await screenshot(page, `member-product-${width}`)
    nav = await memberChrome(page, width)
    await nav.getByRole('link', { name: 'طلباتي', exact: true }).click()
    await page.waitForURL(`${base}/orders`)
    await page.getByText('AS-1200', { exact: true }).first().waitFor()
    const text = await page.locator('main').innerText()
    assert(!text.includes('77777777-7777'), 'UUID shown to user')
    assert(!text.includes('USD') && !text.includes('$'), 'Wrong order currency')
    assert(text.includes('₪') && text.includes('بانتظار الدفع'))
    assert(!text.includes('src/lib') && !text.includes('placeholder'), 'Internal data shown')
    await screenshot(page, `member-orders-${width}`)
    await configure({ orders: false })
    await page.reload()
    await page.getByRole('heading', { name: 'لا توجد طلبات بعد' }).waitFor()
    assert.equal(await page.getByRole('link', { name: 'تصفحي المتجر' }).getAttribute('href'), '/member/shop')
    await screenshot(page, `member-orders-empty-${width}`)
    await configure({ orders: true })
  }
  console.log('PASS sidebar navigation, courses/detail, shop/product and friendly orders/data+empty at both widths')

  await configure({ purchase: 'unpaid', role: 'member' })
  for (const id of [video, article]) {
    await page.goto(`${base}/member/courses/${id}`)
    await page.waitForURL(url => url.pathname === '/member/courses' && url.searchParams.get('error') === 'access_denied')
    assert.equal(await page.locator('video').count(), 0)
    assert(!(await page.content()).includes(privateText))
    assert(!(await page.content()).includes('private-lecture.mp4'))
    await memberChrome(page, 1280)
  }
  await configure({ purchase: 'expired' })
  await page.goto(`${base}/member/courses/${audio}`)
  await page.getByRole('heading').first().waitFor()
  assert.equal(await page.locator('audio').count(), 0, 'Expired audio unlocked')
  console.log('PASS existing unpaid video/article and expired meditation gates remain closed')

  await configure({ purchase: 'unpaid' })
  await page.goto(`${base}/member/courses`)
  await page.locator('article').filter({ hasText: 'العودة إلى التوازن' }).getByRole('button', { name: 'اشتري الآن', exact: true }).click()
  await page.getByText('AS-1234', { exact: true }).first().waitFor()
  const purchaseState = await (await fetch(`${api}/test/state`)).json()
  const purchaseCall = purchaseState.calls.find(call => call.path === '/rest/v1/course_purchases' && call.method === 'POST')
  assert.equal(purchaseCall.payload.course_id, article)
  assert.equal(purchaseCall.payload.status, 'pending')
  assert.equal(purchaseCall.payload.payment_method, 'bank_transfer')
  await memberChrome(page, 1280)
  console.log('PASS existing pending course purchase stays inside member area')

  await page.goto(`${base}/member/shop/${product}`)
  await page.getByRole('button', { name: /أضيفي/ }).click()
  await page.getByRole('link', { name: /^السلة،/ }).click()
  await page.waitForURL(`${base}/member/cart`)
  await screenshot(page, 'member-cart-1280')
  assert.equal(await page.locator('a[href="/member/checkout"]').count(), 1)
  await page.locator('a[href="/member/checkout"]').click()
  await page.waitForURL(`${base}/member/checkout`)
  await page.getByLabel('استلام من الاستوديو', { exact: true }).check()
  await screenshot(page, 'member-checkout-1280')
  await page.locator('form button[type=submit]').click()
  await page.getByText('AS-1299', { exact: true }).first().waitFor()
  const memberState = await (await fetch(`${api}/test/state`)).json()
  const memberOrder = memberState.calls.find(call => call.path === '/rest/v1/rpc/place_order')
  assert.equal(memberOrder.payload.p_user_id, '33333333-3333-4333-8333-333333333333')
  assert.equal(memberOrder.payload.p_payment_method, 'bank_transfer')
  await screenshot(page, 'member-confirmation-1280')
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('ahlam-space-cart')).length), 0)
  await memberChrome(page, 1280)
  await page.getByRole('button', { name: /طلباتي|الطلبات/ }).click()
  await page.waitForURL(`${base}/orders`)
  console.log('PASS member product -> cart -> checkout -> confirmation -> /orders stays inside member chrome')

  await configure({ purchase: 'paid', role: 'admin' })
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of ['/classes', '/private-sessions']) {
      await page.goto(`${base}${route}`)
      await ready(page)
      await page.waitForFunction(() => {
        const header = document.querySelector('.site-header')
        const main = document.querySelector('main')
        const gap = main.getBoundingClientRect().top + parseFloat(getComputedStyle(main).paddingTop) - header.getBoundingClientRect().bottom
        return gap >= 16 && gap <= 40
      })
      await screenshot(page, `spacing-${route.slice(1)}-${width}`)
    }
    await page.goto(`${base}/admin`)
    await page.getByRole('heading', { name: 'ملخص الإدارة' }).waitFor()
    await screenshot(page, `spacing-admin-${width}`)
    await page.goto(`${base}/login`)
    await page.locator('input[type=email]').waitFor()
    const authTop = await page.locator('section').first().evaluate(el => el.getBoundingClientRect().top)
    assert(authTop >= 80 && authTop <= 100)
    await screenshot(page, `spacing-login-${width}`)
  }
  console.log('PASS public/auth/member/admin entry spacing at 390px and 1280px')

  const guestContext = await browser.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' })
  await guestContext.addInitScript(item => {
    if (!localStorage.getItem('ahlam-space-cart')) localStorage.setItem('ahlam-space-cart', JSON.stringify([item]))
  }, { product_id: product, variant_id: variant, name: 'شمعة سكون', price: 40, size: 'صغير', color: null, quantity: 1, image_url: null })
  const guest = await guestContext.newPage()
  await guest.goto(`${base}/member/shop`)
  await guest.waitForURL(url => url.pathname === '/login')
  await guest.goto(`${base}/checkout`)
  await guest.getByLabel('الاسم الأول', { exact: true }).fill('سلمى')
  await guest.getByLabel('اسم العائلة', { exact: true }).fill('تجريبية')
  await guest.getByLabel('رقم الهاتف', { exact: true }).fill('0500000000')
  await guest.getByLabel('استلام من الاستوديو', { exact: true }).check()
  await screenshot(guest, 'guest-checkout-390')
  await guest.locator('form button[type=submit]').click()
  await guest.getByText('AS-1299', { exact: true }).first().waitFor()
  assert.equal(new URL(guest.url()).pathname, '/checkout')
  assert.equal(await guest.locator('aside').count(), 0)
  const state = await (await fetch(`${api}/test/state`)).json()
  const calls = state.calls.filter(call => call.path === '/rest/v1/rpc/place_order')
  assert(calls.some(call => call.payload.p_user_id === null && call.payload.p_guest_name === 'سلمى تجريبية'))
  assert(calls.every(call => call.payload.p_payment_method === 'bank_transfer'))
  console.log('PASS public guest checkout still uses the same bank-transfer RPC and stays public')
  assert.deepEqual(errors, [], 'Browser runtime errors')
  await browser.close()
  console.log('PASS no client runtime errors; all purchases were local fake requests, no SQL executed')
})().catch(error => { console.error(error); process.exit(1) })

// Local-only fake auth/REST service. Never connects to Supabase or executes SQL.
import http from 'node:http'
const uid = '33333333-3333-4333-8333-333333333333'
const videoId = '11111111-1111-4111-8111-111111111111'
const articleId = '22222222-2222-4222-8222-222222222222'
const audioId = '44444444-4444-4444-8444-444444444444'
const productId = '55555555-5555-4555-8555-555555555555'
const variantId = '66666666-6666-4666-8666-666666666666'
const image = '/images/SunlitSageMedittionDesk.png'
const privateArticle = 'وقت لنفسك، وعودة هادئة إلى التوازن.'
const user = { id: uid, aud: 'authenticated', role: 'authenticated', email: 'member@example.test', email_confirmed_at: new Date().toISOString(), app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: { full_name: 'سلمى تجريبية' }, created_at: '2026-10-01T10:00:00Z' }
const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url')
const token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: uid, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 86400 })}.fixture`
const courses = [
  { id: videoId, title: 'محاضرة اليوغا الواعية', description: 'خطوات هادئة نحو حركة أكثر وعياً.', content_type: 'video', price: 100, cover_image_url: image, duration_minutes: 30, is_active: true, video_url: 'private-lecture.mp4', article_body: null },
  { id: articleId, title: 'العودة إلى التوازن', description: 'قراءة قصيرة تمنحك لحظة لنفسك.', content_type: 'article', price: 60, cover_image_url: image, duration_minutes: null, is_active: true, video_url: null, article_body: privateArticle },
  { id: audioId, title: 'تأمل هادئ', description: 'مساحة للتنفس والراحة.', content_type: 'audio', price: 80, cover_image_url: image, duration_minutes: 15, is_active: true },
]
const product = { id: productId, name: 'شمعة سكون', description: 'لحظات من الهدوء في ضوء شمعة.', image_url: image, price: 40, is_active: true, product_variants: [{ id: variantId, size: 'صغير', color: null, stock: 12, sku: 'FIXTURE-CANDLE' }] }
const statuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled']
const orders = statuses.map((status, index) => ({
  id: `77777777-7777-4777-8777-${String(index).padStart(12, '0')}`, user_id: uid, created_at: new Date(Date.UTC(2026, 10, 12 - index, 10)).toISOString(),
  status, reference: `AS-${1200 + index}`, fulfillment_method: index % 2 ? 'delivery' : 'pickup', delivery_address: index % 2 ? 'رام الله، شارع تجريبي' : null, total: 80,
  order_items: [{ id: `item-${index}`, quantity: 2, unit_price: 40, product_variants: { size: 'صغير', color: null, products: { name: product.name, image_url: image } } }],
}))
let config = { purchase: 'paid', orders: true, role: 'admin' }
let calls = []

function project(row, select) {
  if (!select || select === '*') return row
  return Object.fromEntries(select.split(',').filter(key => key in row).map(key => [key, row[key]]))
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS,HEAD')
  res.setHeader('Content-Type', 'application/json')
  if (req.method === 'OPTIONS') return res.end()
  const url = new URL(req.url, 'http://127.0.0.1')
  let raw = ''
  for await (const chunk of req) raw += chunk
  const payload = raw ? JSON.parse(raw) : {}
  const send = (value, status = 200) => { res.statusCode = status; res.end(JSON.stringify(value)) }
  if (url.pathname === '/test/config') { config = { ...config, ...payload }; calls = []; return send(config) }
  if (url.pathname === '/test/state') return send({ config, calls })
  calls.push({ path: url.pathname, query: Object.fromEntries(url.searchParams), method: req.method, payload })
  if (req.method === 'HEAD') { res.setHeader('Content-Range', '0-0/0'); return res.end() }
  if (url.pathname === '/auth/v1/token') return send({ access_token: token, refresh_token: 'fixture-refresh', expires_in: 86400, token_type: 'bearer', user })
  if (url.pathname === '/auth/v1/user') return send(user)
  if (url.pathname === '/rest/v1/profiles') return send({ id: uid, role: config.role, full_name: user.user_metadata.full_name, phone: '0500000000', city: 'رام الله' })
  if (url.pathname === '/rest/v1/courses') {
    const id = url.searchParams.get('id')?.replace('eq.', '')
    const rows = (id ? courses.filter(course => course.id === id) : courses).map(course => project(course, url.searchParams.get('select')))
    return send(req.headers.accept?.includes('vnd.pgrst.object') ? rows[0] ?? null : rows)
  }
  if (url.pathname === '/rest/v1/course_purchases') {
    if (req.method === 'POST') { config.purchase = 'pending'; return send({ reference: 'AS-1234' }, 201) }
    const id = url.searchParams.get('course_id')?.replace('eq.', '')
    return send(config.purchase === 'unpaid' ? [] : courses.filter(course => !id || course.id === id).map(course => ({ id: `purchase-${course.id}`, course_id: course.id, status: config.purchase === 'expired' ? 'paid' : config.purchase, reference: 'AS-1234' })))
  }
  if (url.pathname === '/rest/v1/products') return send(req.headers.accept?.includes('vnd.pgrst.object') ? product : [product])
  if (url.pathname === '/rest/v1/product_variants') return send(product.product_variants)
  if (url.pathname === '/rest/v1/orders') return send(config.orders ? orders : [])
  if (url.pathname === '/rest/v1/rpc/place_order') return send({ id: '88888888-8888-4888-8888-888888888888', reference: 'AS-1299', total: 40 })
  if (url.pathname === '/rest/v1/rpc/get_meditation_access_status') return send(['paid', 'expired'].includes(config.purchase) ? {
    purchase_id: 'audio-purchase', paid_at: new Date().toISOString(), access_expires_at: new Date(Date.now() + (config.purchase === 'expired' ? -1 : 86400) * 1000).toISOString(), is_access_active: config.purchase === 'paid',
  } : null)
  if (url.pathname === '/rest/v1/rpc/get_meditation_audio_path') return send(config.purchase === 'paid' || config.role === 'admin' ? 'private-meditation.mp3' : null)
  if (url.pathname.startsWith('/storage/v1/object/sign/')) return send({ signedURL: `/object/sign/course-videos/private-lecture.mp4?token=fixture` })
  return send([])
})
server.listen(Number(process.env.FIXTURE_PORT || 4342), '127.0.0.1', () => console.log('Local member-area fixture ready'))

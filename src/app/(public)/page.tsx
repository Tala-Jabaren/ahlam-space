import Link from 'next/link'

export default function HomePage() {
  return (
    <div style={{ maxWidth: 600, margin: '40px auto' }}>
      <h1>Welcome</h1>
      <p>Book classes and shop gear, all in one place.</p>
      <nav style={{ display: 'flex', gap: 16, marginTop: 24 }}>
        <Link href="/classes">View Classes</Link>
        <Link href="/shop">Shop</Link>
      </nav>
    </div>
  )
}

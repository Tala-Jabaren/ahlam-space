import Link from 'next/link'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      <nav style={{ display: 'flex', gap: 16, padding: 16 }}>
        <Link href="/">Home</Link>
        <Link href="/about">About</Link>
        <Link href="/classes">Classes</Link>
        <Link href="/schedule">Schedule</Link>
        <Link href="/private-sessions">جلسات فردية</Link>
      </nav>
      {children}
    </div>
  )
}

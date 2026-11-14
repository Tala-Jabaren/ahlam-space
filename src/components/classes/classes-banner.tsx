import Image from 'next/image'

// Shared by the public /classes page and the member-schedule page - same
// banner, same spot (full-bleed, right above each page's own eyebrow/
// heading). Purely decorative (the heading right below it already carries
// the page's title), so alt is empty rather than describing the photo.
export default function ClassesBanner() {
  return (
    <div className="relative h-48 w-full sm:h-64 lg:h-72">
      <Image src="/images/classesbanner.png" alt="" fill priority sizes="100vw" className="object-cover" />
    </div>
  )
}

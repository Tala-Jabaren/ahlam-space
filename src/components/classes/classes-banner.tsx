import Image from 'next/image'

// Shared by the public /classes page and the member-schedule page - same
// banner, same spot (full-bleed, right above each page's own content).
// `title`/`tagline` are optional: the /classes page overlays its own
// heading + tagline directly on the photo (replacing what used to be a
// separate eyebrow/heading/subtitle text block below it); member-schedule
// still passes neither and keeps its own heading block as it was. The
// image itself is purely decorative either way, so alt stays empty.
export default function ClassesBanner({ title, tagline }: { title?: string; tagline?: string }) {
  return (
    <div className="relative h-56 w-full sm:h-72 lg:h-80">
      <Image src="/images/classesbanner.png" alt="" fill priority sizes="100vw" className="object-cover" />
      {title && (
        <>
          <div className="absolute inset-0 bg-black/35" aria-hidden="true" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center text-white">
            <h1 className="font-serif text-5xl sm:text-6xl">{title}</h1>
            {tagline && <p className="mt-4 max-w-xl text-base leading-7 sm:text-lg">{tagline}</p>}
          </div>
        </>
      )}
    </div>
  )
}

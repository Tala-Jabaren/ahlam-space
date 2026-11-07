const words = ['MOVE', 'BALANCE', 'BLOOM']

// Purely decorative - aria-hidden, no interactive content, so (unlike the
// trip photo strip and the reviews strip) there's nothing here to pause on
// hover or focus. It only ever stops under prefers-reduced-motion, via the
// plain CSS media query on .marquee-band-animate in globals.css.
export default function MarqueeBand() {
  const track = [...words, ...words, ...words, ...words]

  return (
    <div aria-hidden="true" className="my-14 -rotate-2 overflow-hidden bg-[#34472B] py-3 sm:my-16">
      <div className="marquee-band-animate flex w-max items-center gap-3 whitespace-nowrap" dir="ltr">
        {[...track, ...track].map((word, index) => (
          <span key={index} className="flex items-center gap-3 text-sm font-bold tracking-[0.2em] text-white">
            {word}
            <span className="text-[#D6E2B6]">✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}

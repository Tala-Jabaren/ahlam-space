export default function AboutPage() {
  return (
    <div className="px-5 py-16 sm:px-8 lg:px-10">
      <section className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="min-h-[360px] rounded-[2rem] bg-[#C7D6E8] p-6">
          <div className="h-full min-h-[312px] rounded-[1.5rem] border border-white/60 bg-[#F7F6F0]/45" />
        </div>
        <div className="space-y-6">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#617A55]">
            About the studio
          </p>
          <h1 className="font-serif text-5xl leading-tight text-[#25311f] sm:text-6xl">
            A grounded space for returning to yourself.
          </h1>
          <p className="text-lg leading-8 text-[#4f5d49]">
            Placeholder bio. This paragraph will be replaced with the
            trainer&apos;s real background, certifications, and training
            philosophy.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-16 grid max-w-7xl gap-6 md:grid-cols-3">
        {['Warm', 'Intentional', 'Local'].map((value) => (
          <div
            key={value}
            className="rounded-[1.5rem] bg-[#D6E2B6]/60 p-7 text-[#4f5d49]"
          >
            <h2 className="font-serif text-3xl text-[#617A55]">{value}</h2>
            <p className="mt-3 leading-7">
              Gentle editorial space for studio values, training philosophy,
              and the feeling guests can expect when they arrive.
            </p>
          </div>
        ))}
      </section>
    </div>
  )
}

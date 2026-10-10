export default function ClassesLoading() {
  return (
    <div className="px-5 py-16 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="h-4 w-32 animate-pulse rounded bg-[#C7D6E8]/35" />
        <div className="h-12 w-64 animate-pulse rounded bg-[#C7D6E8]/35" />
        <div className="h-5 w-96 max-w-full animate-pulse rounded bg-[#C7D6E8]/25" />
      </div>

      <div className="mx-auto mt-12 max-w-7xl grid gap-7">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-[1.75rem] border border-[#617A55]/10 bg-white/65"
          >
            <div className="grid lg:grid-cols-[minmax(250px,0.7fr)_1.5fr]">
              <div className="min-h-[220px] animate-pulse bg-[#D6E2B6]/45" />
              <div className="space-y-3 p-6 sm:p-7">
                <div className="h-7 w-48 animate-pulse rounded bg-[#C7D6E8]/35" />
                <div className="h-20 animate-pulse rounded-lg bg-[#C7D6E8]/20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

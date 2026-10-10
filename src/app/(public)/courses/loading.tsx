export default function CoursesLoading() {
  return (
    <main className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="space-y-4 border-b border-[#617A55]/15 pb-8 sm:pb-10">
          <div className="h-10 w-72 animate-pulse rounded bg-[#C7D6E8]/35" />
          <div className="h-5 w-full max-w-2xl animate-pulse rounded bg-[#C7D6E8]/25" />
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-lg border border-[#617A55]/10 bg-[#F7F6F0]"
            >
              <div className="aspect-[4/3] animate-pulse bg-[#C7D6E8]/25" />
              <div className="space-y-3 p-5">
                <div className="h-6 w-3/4 animate-pulse rounded bg-[#C7D6E8]/35" />
                <div className="h-4 w-full animate-pulse rounded bg-[#C7D6E8]/20" />
                <div className="h-10 w-28 animate-pulse rounded-lg bg-[#C7D6E8]/35" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

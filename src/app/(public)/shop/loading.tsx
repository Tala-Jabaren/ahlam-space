export default function ShopLoading() {
  return (
    <div className="bg-[#F7F6F0] pb-16">
      <div className="h-[300px] animate-pulse bg-[#D6E2B6]/35" />
      <main className="mx-auto max-w-7xl px-4 pt-7 sm:px-8 lg:px-10">
        <div className="h-16 animate-pulse rounded-full bg-[#C7D6E8]/30" />
        <ul className="mt-8 grid grid-cols-1 gap-5 min-[520px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <li
              key={index}
              className="overflow-hidden rounded-[20px] border border-[#617A55]/12 bg-white"
            >
              <div className="aspect-[4/3] animate-pulse bg-[#C7D6E8]/25" />
              <div className="space-y-3 p-4">
                <div className="h-5 w-3/4 animate-pulse rounded bg-[#C7D6E8]/35" />
                <div className="h-4 w-full animate-pulse rounded bg-[#C7D6E8]/25" />
                <div className="h-9 w-24 animate-pulse rounded-full bg-[#C7D6E8]/35" />
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}

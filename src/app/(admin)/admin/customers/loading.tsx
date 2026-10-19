export default function CustomersLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" aria-busy="true">
      <p role="status" className="mb-6 text-[#617A55]">جارٍ تحميل الزبائن...</p>
      <div aria-hidden="true" className="space-y-4 motion-safe:animate-pulse">
        <div className="h-12 w-40 rounded bg-[#D6E2B6]/60" />
        <div className="h-12 rounded bg-[#C7D6E8]/30" />
        {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-16 rounded border border-[#617A55]/10 bg-white" />)}
      </div>
    </main>
  )
}

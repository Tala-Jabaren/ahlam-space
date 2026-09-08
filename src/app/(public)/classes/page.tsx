import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'

export default async function ClassesPage() {
  const supabase = await createClient()
  const { data: classes, error } = await supabase
    .from('classes')
    .select('*')
    .eq('is_active', true)
    .returns<Tables<'classes'>[]>()

  if (error) {
    console.error('Failed to load classes:', error.message)
  }

  return (
    <div className="px-5 py-16 sm:px-8 lg:px-10">
      <section className="mx-auto max-w-7xl">
        <div className="max-w-3xl space-y-5">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#617A55]">
            Weekly movement
          </p>
          <h1 className="font-serif text-5xl leading-tight text-[#25311f] sm:text-6xl">
            Classes
          </h1>
          <p className="text-lg leading-8 text-[#4f5d49]">
            Explore active yoga, fitness, and dance offerings. Each card is
            designed to breathe with long descriptions and changing class lists.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-7xl">
      {!classes || classes.length === 0 ? (
        <div className="rounded-[1.75rem] bg-[#C7D6E8]/55 p-8 text-[#4f5d49]">
          No classes available right now.
        </div>
      ) : (
        <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {classes.map((c) => (
            <li
              key={c.id}
              className="flex min-h-full flex-col rounded-[1.75rem] border border-[#617A55]/10 bg-white/65 p-6 shadow-sm"
            >
              <div className="mb-5 aspect-[4/3] rounded-[1.5rem] bg-[#D6E2B6]" />
              {c.category && (
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617A55]">
                  {c.category}
                </p>
              )}
              <h2 className="mt-3 font-serif text-3xl leading-tight text-[#25311f]">
                {c.name}
              </h2>
              {c.description && (
                <p className="mt-4 flex-1 leading-7 text-[#4f5d49]">
                  {c.description}
                </p>
              )}
              <p className="mt-6 border-t border-[#617A55]/15 pt-4 text-sm font-semibold uppercase tracking-[0.14em] text-[#617A55]">
                {c.duration_minutes} minutes &middot; ${c.price}
              </p>
            </li>
          ))}
        </ul>
      )}
      </section>
    </div>
  )
}

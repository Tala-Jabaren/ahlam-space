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
    <div style={{ maxWidth: 800, margin: '40px auto' }}>
      <h1>Classes</h1>
      {!classes || classes.length === 0 ? (
        <p>No classes available right now.</p>
      ) : (
        <ul>
          {classes.map((c) => (
            <li key={c.id} style={{ marginBottom: 24 }}>
              <h2>{c.name}</h2>
              {c.category && <p>Category: {c.category}</p>}
              {c.description && <p>{c.description}</p>}
              <p>
                {c.duration_minutes} minutes &middot; ${c.price}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

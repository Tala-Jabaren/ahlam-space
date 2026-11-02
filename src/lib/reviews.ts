// Shared shape for public.reviews rows (see supabase/reviews.sql), used by
// both the public home page section and the admin reviews page/editor so
// the two never drift apart.
export type ReviewRow = {
  id: string
  display_order: number | null
  name: string | null
  body: string
  lang: 'ar' | 'en'
  approved: boolean
  sensitive: boolean
  photo_url: string | null
  created_at: string
}

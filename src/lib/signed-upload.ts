import { createAdminClient } from '@/lib/supabase/admin'

// Issues a one-time signed upload token for a path the caller has already
// validated (admin role checked, owner id matched, file format sniffed from
// its header bytes) - the actual file bytes never pass through this server.
// createSignedUploadUrl() itself needs no RLS grant beyond what the admin
// (service-role) client already bypasses; the token it returns is what
// authorizes the later direct-to-storage write, not the caller's own role.
export async function createSignedUpload(bucket: string, path: string, upsert = false) {
  const admin = createAdminClient()
  const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path, { upsert })
  if (error || !data) return null
  return { bucket, path: data.path, token: data.token }
}

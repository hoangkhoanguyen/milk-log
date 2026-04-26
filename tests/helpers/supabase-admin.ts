import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase admin env')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

/** Truncate feedings — runs via service role to bypass RLS. */
export async function truncateFeedings() {
  const c = adminClient()
  // delete-all via filter that always matches; PostgREST disallows bare delete.
  const { error } = await c.from('feedings').delete().not('id', 'is', null)
  if (error) throw new Error('truncateFeedings failed: ' + error.message)
}

/** Make sure a test user exists in auth.users + return its id. */
export async function ensureUser(email: string): Promise<string> {
  const c = adminClient()
  // Try to get existing user.
  const { data: list } = await c.auth.admin.listUsers({ page: 1, perPage: 200 })
  const existing = list?.users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase())
  if (existing) return existing.id
  const { data, error } = await c.auth.admin.createUser({
    email,
    email_confirm: true
  })
  if (error || !data.user) throw new Error(`createUser ${email} failed: ${error?.message}`)
  return data.user.id
}

/** Generate a magic link the test can directly visit to sign in. */
export async function magicLinkFor(email: string): Promise<string> {
  const c = adminClient()
  const { data, error } = await c.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000') + '/auth/callback' }
  })
  if (error || !data.properties?.action_link) {
    throw new Error('generateLink failed: ' + error?.message)
  }
  return data.properties.action_link
}

export async function deleteUser(email: string) {
  const c = adminClient()
  const { data: list } = await c.auth.admin.listUsers({ page: 1, perPage: 200 })
  const u = list?.users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase())
  if (u) {
    await c.auth.admin.deleteUser(u.id)
  }
}

export async function seedFeedings(rows: Array<{ volume_ml: number; fed_at: string; logged_by?: string | null }>) {
  const c = adminClient()
  const { error } = await c.from('feedings').insert(rows)
  if (error) throw new Error('seedFeedings: ' + error.message)
}

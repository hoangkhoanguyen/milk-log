import { config as dotenv } from 'dotenv'
import path from 'node:path'

dotenv({ path: path.resolve(process.cwd(), '.env.test') })

import { adminClient, ensureUser, truncateFeedings, deleteUser } from './supabase-admin'

export default async function globalSetup() {
  const A = process.env.TEST_USER_A_EMAIL!
  const B = process.env.TEST_USER_B_EMAIL!
  const BLOCKED = process.env.TEST_USER_BLOCKED_EMAIL!

  if (!A || !B || !BLOCKED) {
    throw new Error('TEST_USER_*_EMAIL env vars must be set in .env.test')
  }

  // Make sure A & B exist (allowed_emails should have been seeded by 0002 migration).
  await ensureUser(A)
  await ensureUser(B)

  // Make sure BLOCKED user does NOT exist (in case prior runs leaked).
  await deleteUser(BLOCKED)

  // Sanity check: the allowlist must contain A and B but NOT blocked.
  const c = adminClient()
  const { data } = await c.from('allowed_emails').select('email')
  const set = new Set((data ?? []).map((r) => r.email))
  if (!set.has(A) || !set.has(B)) {
    throw new Error(`allowed_emails missing test users. Run migrations + seed first.`)
  }
  if (set.has(BLOCKED)) {
    throw new Error(`${BLOCKED} should NOT be in allowed_emails for the block test to work`)
  }

  await truncateFeedings()
}

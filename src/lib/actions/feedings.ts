'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type FeedingRow = {
  id: string
  volume_ml: number
  fed_at: string
  logged_by: string | null
  created_at: string
}

export type FeedingWithEmail = FeedingRow & { logged_by_email: string | null }

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) throw new Error('NOT_AUTHENTICATED')
  return { supabase, user }
}

export async function addFeeding(input: { volumeMl: number; fedAt?: string }) {
  const volumeMl = Math.round(input.volumeMl)
  if (!Number.isFinite(volumeMl) || volumeMl <= 0 || volumeMl > 2000) {
    return { ok: false as const, error: 'INVALID_VOLUME' }
  }
  const fedAt = input.fedAt ? new Date(input.fedAt).toISOString() : new Date().toISOString()
  const { supabase, user } = await requireUser()
  const { data, error } = await supabase
    .from('feedings')
    .insert({ volume_ml: volumeMl, fed_at: fedAt, logged_by: user.id })
    .select('*')
    .single()
  if (error) return { ok: false as const, error: error.message }
  revalidatePath('/')
  revalidatePath('/history')
  revalidatePath('/stats')
  return { ok: true as const, data: data as FeedingRow }
}

export async function updateFeeding(input: {
  id: string
  volumeMl: number
  fedAt: string
}) {
  const volumeMl = Math.round(input.volumeMl)
  if (!Number.isFinite(volumeMl) || volumeMl <= 0 || volumeMl > 2000) {
    return { ok: false as const, error: 'INVALID_VOLUME' }
  }
  const { supabase } = await requireUser()
  const { error } = await supabase
    .from('feedings')
    .update({ volume_ml: volumeMl, fed_at: new Date(input.fedAt).toISOString() })
    .eq('id', input.id)
  if (error) return { ok: false as const, error: error.message }
  revalidatePath('/')
  revalidatePath('/history')
  revalidatePath('/stats')
  return { ok: true as const }
}

export async function deleteFeeding(id: string) {
  const { supabase } = await requireUser()
  const { error } = await supabase.from('feedings').delete().eq('id', id)
  if (error) return { ok: false as const, error: error.message }
  revalidatePath('/')
  revalidatePath('/history')
  revalidatePath('/stats')
  return { ok: true as const }
}

export async function listFeedings(limit = 200): Promise<FeedingWithEmail[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('feedings_with_email')
    .select('*')
    .order('fed_at', { ascending: false })
    .limit(limit)
  if (error) {
    // If the DB view can't read `auth.users` (common when the view was created
    // as invoker), fall back to the base table so History still works.
    if ((error as { code?: string } | null)?.code === '42501') {
      const { data: rows, error: fallbackError } = await supabase
        .from('feedings')
        .select('*')
        .order('fed_at', { ascending: false })
        .limit(limit)
      if (fallbackError) {
        console.error('listFeedings fallback error', fallbackError)
        return []
      }
      return ((rows ?? []) as FeedingRow[]).map((r) => ({ ...r, logged_by_email: null }))
    }

    console.error('listFeedings error', error)
    return []
  }
  return (data ?? []) as FeedingWithEmail[]
}

export async function getLastFeeding(): Promise<FeedingWithEmail | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('feedings_with_email')
    .select('*')
    .order('fed_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error && (error as { code?: string } | null)?.code === '42501') {
    const { data: row } = await supabase
      .from('feedings')
      .select('*')
      .order('fed_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return row ? ({ ...(row as FeedingRow), logged_by_email: null } as FeedingWithEmail) : null
  }
  return (data ?? null) as FeedingWithEmail | null
}

export async function getTodayTotal(): Promise<{ totalMl: number; count: number }> {
  const supabase = await createClient()
  // Day boundary in VN UTC+7. Compute UTC instant for VN midnight.
  const now = new Date()
  const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  const vnMidnightUtc = Date.UTC(
    vnNow.getUTCFullYear(),
    vnNow.getUTCMonth(),
    vnNow.getUTCDate()
  )
  const startUtc = new Date(vnMidnightUtc - 7 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('feedings')
    .select('volume_ml')
    .gte('fed_at', startUtc)
  const rows = (data ?? []) as { volume_ml: number }[]
  return {
    totalMl: rows.reduce((s, r) => s + r.volume_ml, 0),
    count: rows.length
  }
}

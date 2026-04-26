/**
 * Pure utility functions for formatting and date math.
 * Tested by Vitest unit tests.
 *
 * Timezone: VN UTC+7. We compute "ngày" theo giờ VN bằng cách offset thủ công
 * thay vì dùng Intl (để dễ test deterministically).
 */

const VN_OFFSET_HOURS = 7

/** Trả về Date đại diện cho cùng wall-clock time, nhưng đã dịch sang VN. */
export function toVNDate(d: Date): Date {
  return new Date(d.getTime() + VN_OFFSET_HOURS * 60 * 60 * 1000)
}

/** YYYY-MM-DD theo giờ VN. Dùng làm key group theo ngày. */
export function vnDateKey(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  const v = toVNDate(date)
  return v.toISOString().slice(0, 10)
}

/** "HH:mm" theo giờ VN. */
export function vnTime(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  const v = toVNDate(date)
  const hh = String(v.getUTCHours()).padStart(2, '0')
  const mm = String(v.getUTCMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

/** Format khoảng cách "Xh Ym" hoặc "Xm". */
export function formatGap(ms: number): string {
  if (ms < 0) ms = 0
  const totalMin = Math.round(ms / 60000)
  if (totalMin < 60) return `${totalMin}m`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/** "cách đây 2h 15m" / "vừa xong" */
export function formatRelativePast(from: Date | string, now: Date = new Date()): string {
  const d = typeof from === 'string' ? new Date(from) : from
  const ms = now.getTime() - d.getTime()
  if (ms < 30_000) return 'vừa xong'
  return `cách đây ${formatGap(ms)}`
}

/** Tổng dung tích theo ngày VN. */
export function totalsByDay<T extends { fed_at: string; volume_ml: number }>(
  rows: T[]
): Map<string, { totalMl: number; count: number }> {
  const map = new Map<string, { totalMl: number; count: number }>()
  for (const r of rows) {
    const key = vnDateKey(r.fed_at)
    const cur = map.get(key) ?? { totalMl: 0, count: 0 }
    cur.totalMl += r.volume_ml
    cur.count += 1
    map.set(key, cur)
  }
  return map
}

/** Trung bình ml mỗi ngày (chỉ tính ngày có data). */
export function averageMlPerDay<T extends { fed_at: string; volume_ml: number }>(
  rows: T[]
): number {
  const totals = totalsByDay(rows)
  if (totals.size === 0) return 0
  const sum = Array.from(totals.values()).reduce((s, v) => s + v.totalMl, 0)
  return Math.round(sum / totals.size)
}

/** Trung bình khoảng cách giữa các lần bú (ms). */
export function averageGapMs<T extends { fed_at: string }>(rows: T[]): number {
  if (rows.length < 2) return 0
  const sorted = [...rows].sort(
    (a, b) => new Date(a.fed_at).getTime() - new Date(b.fed_at).getTime()
  )
  let total = 0
  for (let i = 1; i < sorted.length; i++) {
    total += new Date(sorted[i].fed_at).getTime() - new Date(sorted[i - 1].fed_at).getTime()
  }
  return Math.round(total / (sorted.length - 1))
}

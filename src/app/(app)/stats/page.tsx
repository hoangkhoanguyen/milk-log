import { listFeedings } from '@/lib/actions/feedings'
import { StatCard } from '@/components/stat-card'
import { StatsCharts } from '@/components/stats-charts'
import { averageGapMs, averageMlPerDay, formatGap, totalsByDay, vnDateKey } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function StatsPage() {
  const items = await listFeedings(1000)

  // Compute last 30 days (or 7 + 30 separately)
  const totals = totalsByDay(items)

  // Build a 30-day series ending today (VN).
  const days: { date: string; ml: number; count: number }[] = []
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const key = vnDateKey(d)
    const t = totals.get(key)
    days.push({ date: key, ml: t?.totalMl ?? 0, count: t?.count ?? 0 })
  }
  const last7 = days.slice(-7)

  const avgMl = averageMlPerDay(items)
  const avgGap = averageGapMs(items)
  const totalAllTime = items.reduce((s, i) => s + i.volume_ml, 0)

  return (
    <div className="grid gap-6">
      <h1 className="text-xl font-bold">Thống kê</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          label="TB ml/ngày"
          value={
            <span data-testid="stat-avg-ml">
              {avgMl}
              <span className="text-base font-normal text-muted-foreground"> ml</span>
            </span>
          }
          testId="card-avg-ml"
        />
        <StatCard
          label="Khoảng cách TB"
          value={
            <span data-testid="stat-avg-gap">
              {avgGap > 0 ? formatGap(avgGap) : '—'}
            </span>
          }
          testId="card-avg-gap"
        />
        <StatCard
          label="Tổng cộng"
          value={
            <span data-testid="stat-total-all">
              {totalAllTime}
              <span className="text-base font-normal text-muted-foreground"> ml</span>
            </span>
          }
          hint={`${items.length} lần bú`}
          testId="card-total-all"
        />
      </div>

      <StatsCharts last7={last7} last30={days} />

      {items.length === 0 && (
        <div
          className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground"
          data-testid="stats-empty"
        >
          Chưa có dữ liệu.
        </div>
      )}
    </div>
  )
}

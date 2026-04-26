import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getLastFeeding, getTodayTotal } from '@/lib/actions/feedings'
import { AddFeedingDialog } from '@/components/add-feeding-dialog'
import { StatCard } from '@/components/stat-card'
import { Card, CardContent } from '@/components/ui/card'
import { formatRelativePast, vnTime } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [last, today] = await Promise.all([getLastFeeding(), getTodayTotal()])

  return (
    <div className="grid gap-6">
      <section className="grid gap-3 sm:grid-cols-2">
        <StatCard
          label="Hôm nay"
          value={
            <span data-testid="today-total">
              {today.totalMl}
              <span className="text-base font-normal text-muted-foreground"> ml</span>
            </span>
          }
          hint={
            <span data-testid="today-count">
              {today.count} lần bú
            </span>
          }
          testId="card-today"
        />
        <StatCard
          label="Lần gần nhất"
          value={
            last ? (
              <span data-testid="last-volume">
                {last.volume_ml}
                <span className="text-base font-normal text-muted-foreground"> ml</span>
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          }
          hint={
            last ? (
              <span data-testid="last-relative">
                {formatRelativePast(last.fed_at)} · {vnTime(last.fed_at)}
              </span>
            ) : (
              'Chưa có dữ liệu'
            )
          }
          testId="card-last"
        />
      </section>

      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10">
          <p className="text-sm text-muted-foreground">Bé vừa bú xong? Bấm để ghi lại.</p>
          <AddFeedingDialog />
        </CardContent>
      </Card>

      <Link
        href="/history"
        className="inline-flex items-center justify-between rounded-lg border bg-card p-4 text-sm hover:bg-accent"
        data-testid="link-history"
      >
        Xem lịch sử đầy đủ
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}

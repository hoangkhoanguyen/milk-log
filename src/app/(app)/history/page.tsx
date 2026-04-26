import { listFeedings } from '@/lib/actions/feedings'
import { FeedingItem } from '@/components/feeding-item'
import { AddFeedingDialog } from '@/components/add-feeding-dialog'
import { vnDateKey } from '@/lib/format'

export const dynamic = 'force-dynamic'

const dayFormatter = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Asia/Ho_Chi_Minh'
})

export default async function HistoryPage() {
  const items = await listFeedings(200)

  // Group by VN day. Items already sorted desc by fed_at.
  const groups = new Map<string, typeof items>()
  for (const it of items) {
    const key = vnDateKey(it.fed_at)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(it)
  }

  // Determine if multiple authors exist (for showing "ghi bởi" badges).
  const authors = new Set(items.map((i) => i.logged_by_email).filter(Boolean) as string[])
  const showAuthor = authors.size >= 2

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Lịch sử bú</h1>
        <AddFeedingDialog triggerLabel="Thêm" />
      </div>

      {items.length === 0 ? (
        <div
          className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground"
          data-testid="history-empty"
        >
          Chưa có lần bú nào. Bấm "Thêm" để bắt đầu.
        </div>
      ) : (
        <div className="grid gap-6">
          {Array.from(groups.entries()).map(([dayKey, dayItems]) => {
            const totalMl = dayItems.reduce((s, i) => s + i.volume_ml, 0)
            const dateObj = new Date(dayKey + 'T00:00:00+07:00')
            return (
              <section key={dayKey} data-testid="history-day" data-day={dayKey}>
                <header className="mb-2 flex items-baseline justify-between text-xs uppercase tracking-wide text-muted-foreground">
                  <span>{dayFormatter.format(dateObj)}</span>
                  <span data-testid="day-total">
                    {dayItems.length} lần · {totalMl} ml
                  </span>
                </header>
                <div className="grid gap-2">
                  {dayItems.map((it, idx) => {
                    // gap to previous (chronologically earlier) feed in same day
                    const earlier = dayItems[idx + 1]
                    const gap = earlier
                      ? new Date(it.fed_at).getTime() - new Date(earlier.fed_at).getTime()
                      : null
                    return (
                      <FeedingItem
                        key={it.id}
                        item={it}
                        gapToPrev={gap}
                        showAuthor={showAuthor}
                      />
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

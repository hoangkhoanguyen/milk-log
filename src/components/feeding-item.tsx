'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteFeeding, updateFeeding, type FeedingWithEmail } from '@/lib/actions/feedings'
import { vnTime, formatGap } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'

function isoToLocalInput(iso: string): string {
  const d = new Date(iso)
  const vn = new Date(d.getTime() + 7 * 60 * 60 * 1000)
  return vn.toISOString().slice(0, 16)
}
function localInputToISO(local: string): string {
  const [date, time] = local.split('T')
  const [y, m, day] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const utcMs = Date.UTC(y, m - 1, day, hh, mm) - 7 * 60 * 60 * 1000
  return new Date(utcMs).toISOString()
}

export function FeedingItem({
  item,
  gapToPrev,
  showAuthor
}: {
  item: FeedingWithEmail
  gapToPrev: number | null
  showAuthor: boolean
}) {
  const router = useRouter()
  const [editing, setEditing] = React.useState(false)
  const [volume, setVolume] = React.useState(String(item.volume_ml))
  const [fedAt, setFedAt] = React.useState(isoToLocalInput(item.fed_at))
  const [pending, setPending] = React.useState(false)

  async function onDelete() {
    if (!confirm('Xoá lần bú này?')) return
    setPending(true)
    const res = await deleteFeeding(item.id)
    setPending(false)
    if (!res.ok) {
      toast.error('Xoá thất bại')
      return
    }
    toast.success('Đã xoá')
    router.refresh()
  }

  async function onSave() {
    setPending(true)
    const res = await updateFeeding({
      id: item.id,
      volumeMl: Number(volume),
      fedAt: localInputToISO(fedAt)
    })
    setPending(false)
    if (!res.ok) {
      toast.error('Cập nhật thất bại')
      return
    }
    toast.success('Đã cập nhật')
    setEditing(false)
    router.refresh()
  }

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3"
      data-testid="feeding-item"
      data-feeding-id={item.id}
    >
      <div className="flex flex-col">
        <div className="flex items-baseline gap-2">
          <span className="text-base font-mono font-semibold tabular-nums" data-testid="feeding-time">
            {vnTime(item.fed_at)}
          </span>
          <span className="text-lg font-bold tabular-nums" data-testid="feeding-volume">
            {item.volume_ml}
            <span className="text-sm font-normal text-muted-foreground"> ml</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          {gapToPrev !== null && (
            <span data-testid="feeding-gap">+ {formatGap(gapToPrev)}</span>
          )}
          {showAuthor && item.logged_by_email && (
            <span data-testid="feeding-author">ghi bởi {item.logged_by_email}</span>
          )}
        </div>
      </div>

      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Sửa"
          onClick={() => setEditing(true)}
          disabled={pending}
          data-testid="feeding-edit"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Xoá"
          onClick={onDelete}
          disabled={pending}
          data-testid="feeding-delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa lần bú</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <label className="text-sm" htmlFor={`v-${item.id}`}>
              Dung tích (ml)
            </label>
            <Input
              id={`v-${item.id}`}
              type="number"
              min={1}
              max={2000}
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              data-testid="edit-volume"
            />
            <label className="text-sm" htmlFor={`t-${item.id}`}>
              Thời gian (giờ VN)
            </label>
            <Input
              id={`t-${item.id}`}
              type="datetime-local"
              value={fedAt}
              onChange={(e) => setFedAt(e.target.value)}
              data-testid="edit-time"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditing(false)} disabled={pending}>
                Huỷ
              </Button>
              <Button onClick={onSave} disabled={pending} data-testid="edit-save">
                Lưu
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

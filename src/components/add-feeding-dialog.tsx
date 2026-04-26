'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { addFeeding } from '@/lib/actions/feedings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog'

const QUICK_VOLUMES = [60, 90, 120, 150, 180]

function nowLocalInput(): string {
  // datetime-local format YYYY-MM-DDTHH:mm in VN timezone
  const d = new Date()
  const vn = new Date(d.getTime() + 7 * 60 * 60 * 1000)
  return vn.toISOString().slice(0, 16)
}

function localInputToISO(local: string): string {
  // Treat local as VN time (UTC+7) and convert back to UTC ISO.
  const [date, time] = local.split('T')
  const [y, m, day] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const utcMs = Date.UTC(y, m - 1, day, hh, mm) - 7 * 60 * 60 * 1000
  return new Date(utcMs).toISOString()
}

export function AddFeedingDialog({ triggerLabel = 'Thêm lần bú' }: { triggerLabel?: string }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [volume, setVolume] = React.useState('')
  const [showTime, setShowTime] = React.useState(false)
  const [fedAt, setFedAt] = React.useState(nowLocalInput())
  const [pending, setPending] = React.useState(false)

  function reset() {
    setVolume('')
    setShowTime(false)
    setFedAt(nowLocalInput())
  }

  async function submit(volumeMl: number) {
    if (!Number.isFinite(volumeMl) || volumeMl <= 0) {
      toast.error('Dung tích không hợp lệ')
      return
    }
    setPending(true)
    const isoFedAt = showTime ? localInputToISO(fedAt) : new Date().toISOString()
    const res = await addFeeding({ volumeMl, fedAt: isoFedAt })
    setPending(false)
    if (!res.ok) {
      toast.error(res.error === 'INVALID_VOLUME' ? 'Dung tích không hợp lệ' : 'Lưu thất bại')
      return
    }
    toast.success(`Đã lưu ${volumeMl} ml`)
    setOpen(false)
    reset()
    router.refresh()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button size="xl" className="w-full sm:w-auto" data-testid="open-add-feeding">
          <Plus className="h-5 w-5" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ghi lại lần bú</DialogTitle>
          <DialogDescription>Chọn nhanh hoặc nhập số ml.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-5 gap-2" role="group" aria-label="quick volumes">
          {QUICK_VOLUMES.map((v) => (
            <Button
              key={v}
              type="button"
              variant="secondary"
              className="h-14 text-base"
              onClick={() => submit(v)}
              disabled={pending}
              data-testid={`quick-${v}`}
            >
              {v}
            </Button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit(Number(volume))
          }}
          className="grid gap-3"
        >
          <label className="text-sm font-medium" htmlFor="volume">
            Hoặc nhập tay (ml)
          </label>
          <div className="flex gap-2">
            <Input
              id="volume"
              type="number"
              inputMode="numeric"
              min={1}
              max={2000}
              step={5}
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              placeholder="vd: 95"
              data-testid="volume-input"
              autoFocus
            />
            <Button type="submit" disabled={pending || !volume} data-testid="submit-feeding">
              Lưu
            </Button>
          </div>

          {!showTime ? (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 self-start"
              onClick={() => setShowTime(true)}
              data-testid="toggle-time"
            >
              <Clock className="h-3 w-3" />
              Chỉnh thời gian (mặc định: bây giờ)
            </button>
          ) : (
            <div className="grid gap-1">
              <label className="text-xs text-muted-foreground" htmlFor="fed-at">
                Thời gian bú (giờ VN)
              </label>
              <Input
                id="fed-at"
                type="datetime-local"
                value={fedAt}
                onChange={(e) => setFedAt(e.target.value)}
                data-testid="fed-at-input"
              />
            </div>
          )}
        </form>

        <DialogClose asChild>
          <button className="hidden" aria-hidden />
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}

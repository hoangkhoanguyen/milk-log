import { describe, expect, it } from 'vitest'
import {
  averageGapMs,
  averageMlPerDay,
  formatGap,
  formatRelativePast,
  totalsByDay,
  vnDateKey,
  vnTime
} from '@/lib/format'

describe('formatGap', () => {
  it('renders minutes under an hour', () => {
    expect(formatGap(5 * 60_000)).toBe('5m')
    expect(formatGap(59 * 60_000)).toBe('59m')
  })
  it('renders hours and minutes', () => {
    expect(formatGap(2 * 60 * 60_000 + 15 * 60_000)).toBe('2h 15m')
  })
  it('renders whole hours', () => {
    expect(formatGap(3 * 60 * 60_000)).toBe('3h')
  })
  it('clamps negative to 0', () => {
    expect(formatGap(-1000)).toBe('0m')
  })
})

describe('vnDateKey + vnTime', () => {
  it('shifts UTC to VN day boundary', () => {
    // 2026-04-25 18:00 UTC = 2026-04-26 01:00 VN → next day
    const iso = '2026-04-25T18:00:00.000Z'
    expect(vnDateKey(iso)).toBe('2026-04-26')
    expect(vnTime(iso)).toBe('01:00')
  })
  it('keeps same day inside VN window', () => {
    const iso = '2026-04-25T03:30:00.000Z' // 10:30 VN
    expect(vnDateKey(iso)).toBe('2026-04-25')
    expect(vnTime(iso)).toBe('10:30')
  })
})

describe('formatRelativePast', () => {
  it('returns "vừa xong" for very recent', () => {
    const now = new Date('2026-04-25T10:00:00Z')
    const past = new Date('2026-04-25T09:59:50Z')
    expect(formatRelativePast(past, now)).toBe('vừa xong')
  })
  it('formats older gaps', () => {
    const now = new Date('2026-04-25T10:00:00Z')
    const past = new Date('2026-04-25T07:45:00Z')
    expect(formatRelativePast(past, now)).toBe('cách đây 2h 15m')
  })
})

describe('totalsByDay', () => {
  it('groups by VN day and sums volume', () => {
    const rows = [
      { fed_at: '2026-04-25T03:00:00Z', volume_ml: 90 }, // 25 VN
      { fed_at: '2026-04-25T08:00:00Z', volume_ml: 120 }, // 25 VN
      { fed_at: '2026-04-25T18:00:00Z', volume_ml: 60 } // 26 VN
    ]
    const map = totalsByDay(rows)
    expect(map.get('2026-04-25')).toEqual({ totalMl: 210, count: 2 })
    expect(map.get('2026-04-26')).toEqual({ totalMl: 60, count: 1 })
  })
})

describe('averageMlPerDay', () => {
  it('averages over days that have data', () => {
    const rows = [
      { fed_at: '2026-04-24T03:00:00Z', volume_ml: 100 },
      { fed_at: '2026-04-25T03:00:00Z', volume_ml: 150 },
      { fed_at: '2026-04-25T08:00:00Z', volume_ml: 50 }
    ]
    expect(averageMlPerDay(rows)).toBe(150) // (100 + 200) / 2
  })
  it('handles empty', () => {
    expect(averageMlPerDay([])).toBe(0)
  })
})

describe('averageGapMs', () => {
  it('returns 0 with <2 rows', () => {
    expect(averageGapMs([])).toBe(0)
    expect(averageGapMs([{ fed_at: '2026-04-25T10:00:00Z' }])).toBe(0)
  })
  it('averages gaps after sorting', () => {
    // gaps 1h and 3h → avg 2h = 7_200_000 ms
    const rows = [
      { fed_at: '2026-04-25T13:00:00Z' },
      { fed_at: '2026-04-25T09:00:00Z' },
      { fed_at: '2026-04-25T10:00:00Z' }
    ]
    expect(averageGapMs(rows)).toBe(2 * 60 * 60_000)
  })
})

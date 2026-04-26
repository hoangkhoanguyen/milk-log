import { test, expect } from '@playwright/test'
import { ensureUser, seedFeedings, truncateFeedings } from '../helpers/supabase-admin'
import { loginAs } from '../helpers/login'

const A = process.env.TEST_USER_A_EMAIL!

test.describe('Trang lịch sử', () => {
  test.beforeEach(async () => {
    await truncateFeedings()
  })

  test('Test 11 — group theo ngày + tổng/ngày đúng', async ({ page }) => {
    const aId = await ensureUser(A)
    const day = (offset: number, hour: number) => {
      const d = new Date()
      d.setUTCDate(d.getUTCDate() - offset)
      d.setUTCHours(hour, 0, 0, 0)
      return d.toISOString()
    }
    await seedFeedings([
      { volume_ml: 100, fed_at: day(0, 3), logged_by: aId },
      { volume_ml: 50, fed_at: day(0, 6), logged_by: aId },
      { volume_ml: 80, fed_at: day(1, 4), logged_by: aId },
      { volume_ml: 90, fed_at: day(2, 5), logged_by: aId }
    ])

    await loginAs(page, A)
    await page.goto('/history')

    const days = page.getByTestId('history-day')
    await expect(days).toHaveCount(3)

    const totals = await page.getByTestId('day-total').allInnerTexts()
    // Newest day first: 2 lần · 150 ml, 1 lần · 80 ml, 1 lần · 90 ml
    expect(totals[0]).toContain('150 ml')
    expect(totals[0]).toContain('2 lần')
    expect(totals[1]).toContain('80 ml')
    expect(totals[2]).toContain('90 ml')
  })

  test('Test 12 — khoảng cách "+ 2h 15m" giữa 2 lần cùng ngày', async ({ page }) => {
    const aId = await ensureUser(A)
    const t1 = new Date('2026-04-25T09:00:00Z')
    const t2 = new Date(t1.getTime() + (2 * 60 + 15) * 60_000)
    await seedFeedings([
      { volume_ml: 100, fed_at: t1.toISOString(), logged_by: aId },
      { volume_ml: 110, fed_at: t2.toISOString(), logged_by: aId }
    ])

    await loginAs(page, A)
    await page.goto('/history')

    // Most recent (t2) item shows gap to earlier (t1) = 2h 15m
    await expect(page.getByTestId('feeding-gap').first()).toHaveText('+ 2h 15m')
  })
})

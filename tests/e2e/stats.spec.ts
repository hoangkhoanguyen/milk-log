import { test, expect } from '@playwright/test'
import { ensureUser, seedFeedings, truncateFeedings } from '../helpers/supabase-admin'
import { loginAs } from '../helpers/login'

const A = process.env.TEST_USER_A_EMAIL!

test.describe('Trang stats', () => {
  test.beforeEach(async () => {
    await truncateFeedings()
  })

  test('Test 13 — biểu đồ render với 7 ngày data', async ({ page }) => {
    const aId = await ensureUser(A)
    const rows: Array<{ volume_ml: number; fed_at: string; logged_by: string }> = []
    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setUTCDate(d.getUTCDate() - i)
      d.setUTCHours(4, 0, 0, 0)
      rows.push({ volume_ml: 100, fed_at: d.toISOString(), logged_by: aId })
    }
    await seedFeedings(rows)

    await loginAs(page, A)
    await page.goto('/stats')

    await expect(page.getByTestId('chart-7')).toBeVisible()
    await expect(page.getByTestId('chart-30')).toBeVisible()
    await expect(page.getByTestId('stat-avg-ml')).toContainText('100')
    await expect(page.getByTestId('stat-total-all')).toContainText('700')

    // The 7-day bar chart should have 7 bars rendered as <path> inside rechart svg.
    const bars = page.locator('[data-testid="chart-7"] svg .recharts-bar-rectangle')
    await expect(bars).toHaveCount(7, { timeout: 10_000 })
  })
})

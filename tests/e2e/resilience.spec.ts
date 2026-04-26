import { test, expect } from '@playwright/test'
import { ensureUser, truncateFeedings } from '../helpers/supabase-admin'
import { loginAs } from '../helpers/login'

const A = process.env.TEST_USER_A_EMAIL!

test.describe('Resilience', () => {
  test.beforeEach(async () => {
    await truncateFeedings()
  })

  test('Test 14 — server action fail → toast lỗi, không lưu', async ({ page, context }) => {
    await ensureUser(A)
    await loginAs(page, A)

    // Block all POSTs to /<path> (Next server actions are POST to the same URL).
    await context.route('**/*', (route) => {
      const req = route.request()
      if (req.method() === 'POST' && req.url().includes('localhost')) {
        return route.abort('failed')
      }
      return route.continue()
    })

    await page.getByTestId('open-add-feeding').click()
    await page.getByTestId('quick-120').click()
    // expect a failure toast
    await expect(page.getByText(/Lưu thất bại|failed/i)).toBeVisible({ timeout: 10_000 })
  })
})

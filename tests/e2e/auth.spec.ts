import { test, expect } from '@playwright/test'
import { adminClient, deleteUser } from '../helpers/supabase-admin'
import { loginAs } from '../helpers/login'

const A = process.env.TEST_USER_A_EMAIL!
const BLOCKED = process.env.TEST_USER_BLOCKED_EMAIL!

test.describe('Auth + allowlist', () => {
  test('Test 1 — magic link login (email hợp lệ)', async ({ page }) => {
    await loginAs(page, A, '/')
    await expect(page.getByTestId('card-today')).toBeVisible()
  })

  test('Test 2 — email không trong allowlist bị từ chối', async ({ page }) => {
    // Make sure no leftover user from a prior failed run.
    await deleteUser(BLOCKED)

    await page.goto('/login')
    await page.getByTestId('login-email').fill(BLOCKED)
    await page.getByTestId('login-submit').click()

    // Toast or error appears (Supabase returns an error from the trigger).
    await expect(
      page.getByText(/không được phép đăng nhập|database error/i)
    ).toBeVisible({ timeout: 10_000 })

    // Also assert no user was created in the DB.
    const c = adminClient()
    const { data } = await c.auth.admin.listUsers({ page: 1, perPage: 200 })
    const found = data?.users.find((u) => (u.email || '').toLowerCase() === BLOCKED.toLowerCase())
    expect(found).toBeUndefined()
  })

  test('Test 3 — middleware redirect khi chưa login', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('/')
    await expect(page).toHaveURL(/\/login$/)
    await page.goto('/history')
    await expect(page).toHaveURL(/\/login$/)
    await page.goto('/stats')
    await expect(page).toHaveURL(/\/login$/)
  })
})

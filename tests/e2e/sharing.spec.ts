import { test, expect } from '@playwright/test'
import { ensureUser, seedFeedings, truncateFeedings } from '../helpers/supabase-admin'
import { loginAs, logout } from '../helpers/login'

const A = process.env.TEST_USER_A_EMAIL!
const B = process.env.TEST_USER_B_EMAIL!

test.describe('Chia sẻ dữ liệu giữa các user trong allowlist', () => {
  test.beforeEach(async () => {
    await truncateFeedings()
  })

  test('Test 9 — user B thấy được dữ liệu user A vừa nhập', async ({ page }) => {
    await ensureUser(A)
    await ensureUser(B)

    // A logs in, adds 110ml
    await loginAs(page, A)
    await page.getByTestId('open-add-feeding').click()
    await page.getByTestId('volume-input').fill('110')
    await page.getByTestId('submit-feeding').click()
    await expect(page.getByText('Đã lưu 110 ml')).toBeVisible()

    // Logout, log in as B
    await logout(page)
    await loginAs(page, B)
    await page.goto('/history')

    // B sees A's record
    await expect(page.getByTestId('feeding-volume').first()).toContainText('110')
    // Author badge should appear since B is logged in but A authored — that's 2 authors visible (A only here, but to test the >=2 rule, also add a B feed below)
  })

  test('Test 10 — user B xoá được record user A đã tạo', async ({ page }) => {
    const aId = await ensureUser(A)
    await ensureUser(B)
    await seedFeedings([{ volume_ml: 100, fed_at: new Date().toISOString(), logged_by: aId }])

    await loginAs(page, B)
    await page.goto('/history')
    page.once('dialog', (d) => d.accept())
    await page.getByTestId('feeding-delete').first().click()
    await expect(page.getByText('Đã xoá')).toBeVisible()

    await logout(page)
    await loginAs(page, A)
    await page.goto('/history')
    await expect(page.getByTestId('history-empty')).toBeVisible()
  })

  test('Test 15 — badge "ghi bởi" hiển thị khi có >=2 author', async ({ page }) => {
    const aId = await ensureUser(A)
    const bId = await ensureUser(B)
    await seedFeedings([
      { volume_ml: 90, fed_at: new Date(Date.now() - 60_000).toISOString(), logged_by: aId },
      { volume_ml: 110, fed_at: new Date().toISOString(), logged_by: bId }
    ])

    await loginAs(page, A)
    await page.goto('/history')
    const authors = page.getByTestId('feeding-author')
    await expect(authors.first()).toBeVisible()
    await expect(authors).toHaveCount(2)
  })
})

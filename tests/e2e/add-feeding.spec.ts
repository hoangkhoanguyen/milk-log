import { test, expect } from '@playwright/test'
import { adminClient, ensureUser, truncateFeedings } from '../helpers/supabase-admin'
import { loginAs } from '../helpers/login'

const A = process.env.TEST_USER_A_EMAIL!

test.describe('Thêm / sửa / xoá lần bú', () => {
  test.beforeEach(async () => {
    await truncateFeedings()
  })

  test('Test 4 — quick-pick 120ml', async ({ page }) => {
    const userId = await ensureUser(A)
    await loginAs(page, A)
    await page.getByTestId('open-add-feeding').click()
    await page.getByTestId('quick-120').click()
    await expect(page.getByText('Đã lưu 120 ml')).toBeVisible()

    await expect(page.getByTestId('today-total')).toContainText('120')
    await expect(page.getByTestId('last-volume')).toContainText('120')

    // DB check
    const c = adminClient()
    const { data } = await c.from('feedings').select('volume_ml, logged_by').limit(1).single()
    expect(data?.volume_ml).toBe(120)
    expect(data?.logged_by).toBe(userId)
  })

  test('Test 5 — nhập tay 95ml', async ({ page }) => {
    await loginAs(page, A)
    await page.getByTestId('open-add-feeding').click()
    await page.getByTestId('volume-input').fill('95')
    await page.getByTestId('submit-feeding').click()
    await expect(page.getByText('Đã lưu 95 ml')).toBeVisible()

    const c = adminClient()
    const { data } = await c.from('feedings').select('volume_ml').limit(1).single()
    expect(data?.volume_ml).toBe(95)
  })

  test('Test 6 — thêm với thời gian lùi 2h', async ({ page }) => {
    await loginAs(page, A)
    await page.getByTestId('open-add-feeding').click()
    await page.getByTestId('toggle-time').click()

    const past = new Date(Date.now() - 2 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000)
    const local = past.toISOString().slice(0, 16)
    await page.getByTestId('fed-at-input').fill(local)
    await page.getByTestId('volume-input').fill('60')
    await page.getByTestId('submit-feeding').click()
    await expect(page.getByText('Đã lưu 60 ml')).toBeVisible()

    // last-relative shows "cách đây 2h" or close
    await expect(page.getByTestId('last-relative')).toContainText(/2h|1h 5\d/)
  })

  test('Test 7 — sửa từ 120 → 130', async ({ page }) => {
    await loginAs(page, A)
    await page.getByTestId('open-add-feeding').click()
    await page.getByTestId('quick-120').click()
    await expect(page.getByText('Đã lưu 120 ml')).toBeVisible()

    await page.goto('/history')
    await page.getByTestId('feeding-edit').first().click()
    await page.getByTestId('edit-volume').fill('130')
    await page.getByTestId('edit-save').click()
    await expect(page.getByText('Đã cập nhật')).toBeVisible()
    await expect(page.getByTestId('feeding-volume').first()).toContainText('130')

    const c = adminClient()
    const { data } = await c.from('feedings').select('volume_ml').limit(1).single()
    expect(data?.volume_ml).toBe(130)
  })

  test('Test 8 — xoá lần bú', async ({ page }) => {
    await loginAs(page, A)
    await page.getByTestId('open-add-feeding').click()
    await page.getByTestId('quick-90').click()
    await expect(page.getByText('Đã lưu 90 ml')).toBeVisible()

    await page.goto('/history')
    page.once('dialog', (d) => d.accept())
    await page.getByTestId('feeding-delete').first().click()
    await expect(page.getByText('Đã xoá')).toBeVisible()
    await expect(page.getByTestId('history-empty')).toBeVisible()

    const c = adminClient()
    const { count } = await c.from('feedings').select('*', { count: 'exact', head: true })
    expect(count ?? 0).toBe(0)
  })
})

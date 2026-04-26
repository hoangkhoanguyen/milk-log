import type { Page } from '@playwright/test'
import { magicLinkFor } from './supabase-admin'

/** Sign in by visiting an admin-generated magic link, ending up on `next` page. */
export async function loginAs(page: Page, email: string, next = '/') {
  const link = await magicLinkFor(email)
  // The link points to Supabase /verify which redirects to /auth/callback?code=...
  await page.goto(link)
  await page.waitForURL((url) => url.pathname === next || url.pathname === '/', { timeout: 15_000 })
}

export async function logout(page: Page) {
  await page.getByTestId('logout').click()
  await page.waitForURL('**/login')
}

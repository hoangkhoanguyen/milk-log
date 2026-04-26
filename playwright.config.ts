import { defineConfig, devices } from '@playwright/test'
import { config as dotenv } from 'dotenv'
import path from 'node:path'

dotenv({ path: path.resolve(process.cwd(), '.env.test') })

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/helpers/global-setup.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : [['list']],
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    actionTimeout: 10_000
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/login',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NODE_ENV: 'development'
    }
  }
})

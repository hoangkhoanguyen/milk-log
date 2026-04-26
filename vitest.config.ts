import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  css: { postcss: { plugins: [] } },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts']
  }
})

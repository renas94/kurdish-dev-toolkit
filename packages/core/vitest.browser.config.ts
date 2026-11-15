// Runs the same test files in real browsers through Playwright.
// Usage: BROWSER=chromium|firefox|webkit npx vitest run -c vitest.browser.config.ts
import { defineConfig } from 'vitest/config';

const name = process.env.BROWSER ?? 'chromium';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    browser: {
      enabled: true,
      provider: 'playwright',
      headless: true,
      name,
    },
  },
});

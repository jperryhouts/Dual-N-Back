const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/integration',
  timeout: 30_000,
  retries: 1,
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.005,
    },
  },
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'npx serve app -l 3000 --no-clipboard',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
